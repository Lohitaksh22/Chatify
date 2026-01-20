import { NextResponse, NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth"



export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const currentUserId = await getCurrUserId(req)

    const { chatId } = await params
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
          memberId: currentUserId,
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
    const take = Math.min(Number(url.searchParams.get("limit") ?? 20), 100)
    const cursor = url.searchParams.get("cursor") ?? undefined

    const messages = await prisma.messages.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, username: true, image: true } },
        attachments: true,
      },
    })



    const nextCursor = messages.length ? messages[messages.length - 1].id : null
    
    messages.reverse()

    const markRead = url.searchParams.get("markRead") === "true"
    const latest = messages.length ? messages[messages.length - 1] : null

    if (markRead && latest) {
      await prisma.messageRead.upsert({
        where: { messageId_userId: { messageId: latest.id, userId: currentUserId } },
        create: { messageId: latest.id, userId: currentUserId, readAt: new Date() },
        update: { readAt: new Date() },
      })
    }

    let readBy: Array<{ id: string; username: string; image: string | null }> = []
    if (latest) {
      const readers = await prisma.messageRead.findMany({
        where: { messageId: latest.id },
        include: { user: true },
      });
      readBy = readers.map((r) => r.user ?? null).filter(Boolean)
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    })

    const lastMessage = messages.at(-1)


    return NextResponse.json({ chat, messages, currentUserId, latestReadby: readBy, currentUser, nextCursor, lastMessage }, { status: 200 })


  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }>  }) {
  try {
    const currentUserId = await getCurrUserId(req)


    const { chatId } = await params
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
          memberId: currentUserId,
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



    if (!content && !String(content) && attachments.length === 0) {
      return NextResponse.json({ msg: "Empty message" }, { status: 400 });
    }


    const created = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.messages.create({
        data: {
          content,
          senderId: currentUserId,
          chatId
        }
      })

      for (const a of attachments) {

        const url = a.url ?? a.secureUrl
        await tx.attachment.create({
          data: {
            messageId: newMessage.id,
            url,
            type: a.type ?? "unknown",
          },
        });
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