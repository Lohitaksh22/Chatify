import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
})

async function verifyChatAttachment(publicId: string, chatId: string) {

  const resource = await cloudinary.api.resource(publicId)


  if (
    !resource.public_id.includes(`temp/chats/${chatId}`) &&
    !(resource.folder && resource.folder.includes(`temp/chats/${chatId}`))
  ) {
    throw new Error("Invalid attachment location")
  }


  if (resource.bytes > 10 * 1024 * 1024) {
    throw new Error("Attachment too large")
  }


  const allowedFormats = ["jpg", "jpeg", "png", "webp", "mp4"]
  if (!allowedFormats.includes(resource.format)) {
    throw new Error("Unsupported attachment format")
  }

  return {
    publicId: resource.public_id,
    secureUrl: resource.secure_url,
    bytes: resource.bytes,
    format: resource.format,
    resourceType: resource.resource_type,
  }
}

export async function GET(req: Request, { params }: { params: { chatId: string } }) {
  try {
    const userPayload = await requireUser()
    if (!userPayload) {
      return NextResponse.json(
        { msg: "Unauthorized User" },
        { status: 401 }
      )
    }

    const { chatId } = params
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: true
      }
    })

    if (!chat) {
      return NextResponse.json(
        { msg: "Chat Not Found" },
        { status: 404 }
      )
    }

    const isMember = await prisma.chatMember.findUnique({
      where: {
        memberId_chatId: {
          memberId: userPayload.sub,
          chatId
        }
      }
    }
    )

    if (!isMember) {
      return NextResponse.json(
        { msg: "Forbidden" },
        { status: 403 }
      )
    }



    const url = new URL(req.url)
    const limitParam = Number(url.searchParams.get("limit")) || 50
    const limit = Math.min(Math.max(limitParam, 1), 200)
    const cursor = url.searchParams.get("cursor") || undefined

    const messages = await prisma.messages.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, username: true, image: true },
        },
        attachments: true,

        messageReads: { select: { userId: true, readAt: true } },
      },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const markRead = url.searchParams.get("markRead") === "true"
    const latest = messages.length ? messages[messages.length - 1] : null

    if (markRead && latest) {
      await prisma.messageRead.upsert({
        where: { messageId_userId: { messageId: latest.id, userId: userPayload.sub } },
        create: { messageId: latest.id, userId: userPayload.sub, readAt: new Date() },
        update: { readAt: new Date() },
      })
    }

    let readBy: Array<{ id: string; username: string; image: string | null }> = []
    if (latest) {
      const readers = await prisma.messageRead.findMany({
        where: { messageId: latest.id },
        include: { user: { select: { id: true, username: true, image: true } } },
      });
      readBy = readers.map(r => r.user)
    }


    return NextResponse.json({ chat, messages, latestReadBy: readBy }, { status: 200 })



  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request, { params }: { params: { chatId: string } }) {
  try {
    const userPayload = await requireUser()
    if (!userPayload) {
      return NextResponse.json(
        { msg: "Unauthorized User" },
        { status: 401 }
      )
    }


    const { chatId } = params
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: true
      }
    })

    if (!chat) {
      return NextResponse.json(
        { msg: "Chat Not Found" },
        { status: 404 }
      )
    }

    const isMember = await prisma.chatMember.findUnique({
      where: {
        memberId_chatId: {
          memberId: userPayload.sub,
          chatId
        }
      }
    }
    )

    if (!isMember) {
      return NextResponse.json(
        { msg: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const content = typeof body.content === "string" ? body.content.trim() : ""
    const attachments = Array.isArray(body.attachments) ? body.attachments : []


    if (!String(content) || !content) {
      return
    }

    const verifiedAttachments: {
      publicId: string
      secureUrl: string
      bytes: number
      format: string
      resourceType: string
    }[] = []

    for (const att of attachments) {
      if (!att?.publicId) return NextResponse.json({ msg: "Invalid attachment payload" }, { status: 400 })
      try {
        const v = await verifyChatAttachment(att.publicId, chatId)
        verifiedAttachments.push(v)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error("Attachment verification failed:", err)
        return NextResponse.json({ msg: "Attachment verification failed", detail: message }, { status: 400 })
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.messages.create({
        data: {
          content,
          senderId: userPayload.sub,
          chatId
        }
      })

      const attachmentRows: Array<{ id: string; url: string }> = []
      for (const v of verifiedAttachments) {
        const row = await tx.attachment.create({
          data: {
            messageId: newMessage.id,
            url: v.secureUrl,
            type: v.resourceType ?? v.format ?? "unknown",
          },
          select: { id: true, url: true },
        })
        attachmentRows.push(row)
      }

      await tx.chat.update({
        where: { id: chatId },
        data: {
          lastMessage: newMessage.content,
          lastMessageAt: new Date()
        }
      })

      const fullMessage = await tx.messages.findUnique({
        where: { id: newMessage.id },
        include: {
          sender: { select: { id: true, username: true, image: true } },
          attachments: true,
        },
      })

      return fullMessage

    })

    return NextResponse.json(
      { created },
      { status: 200 }
    )


  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}