import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireUser } from "@/lib/auth"


export async function GET() {
  try {
    const userPayload = await requireUser()
    if (!userPayload) {
      return NextResponse.json(
        { msg: "Unauthorized User" },
        { status: 401 }
      )
    }

    const allChats = await prisma.chat.findMany({
      where: {
        chatMembers: {
          some: {
            memberId: userPayload.sub
          }
        }
      },
      orderBy: {
        lastMessageAt: "desc"
      }
    })



    return NextResponse.json(
      { data: allChats },
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

export async function POST(req: Request) {
  try {
    const userPayload = await requireUser()
    if (!userPayload) {
      return NextResponse.json(
        { msg: "Unauthorized User" },
        { status: 401 }
      )
    }

    const { name, usernames, image } = await req.json()
    let isGroup = false
    const currentUserId = userPayload.sub

  


    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json(
        { msg: "Need People to Chat" },
        { status: 400 }
      )
    }

    const users = await Promise.all(
      usernames.map((userName) =>
        prisma.user.findUnique({
          where: { username: userName }
        })
      )
    )

     const memberIds = users.map(user => user?.id)

    if (memberIds.length >= 3) {
      isGroup = true
    }

    const finalMembers = memberIds.map(String)
    finalMembers.push(String(currentUserId))


    if (isGroup && (!image || typeof image !== "string" || image.trim() === "")) {
      return NextResponse.json({ msg: "Group chats require an image" }, { status: 400 })
    }


    let chatName: string | null = null

    if (!isGroup && finalMembers.length === 2) {
      const otherId = finalMembers.find(id => id !== currentUserId)!
      const other = await prisma.user.findUnique({
        where: { id: otherId },
        select: { username: true },
      })
      chatName = other?.username ?? null
    }


    if (!isGroup && finalMembers.length === 2) {
      const [a, b] = finalMembers

      const existing = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { chatMembers: { some: { memberId: a } } },
            { chatMembers: { some: { memberId: b } } },
          ],
        },
        include: {
          chatMembers: {
            select: {
              memberId: true,
              joinedAt: true,
              role: true,
              member: { select: { id: true, username: true, image: true } },
            },
          },
        },
      })

      if (existing) {
        return NextResponse.json({ chat: existing }, { status: 200 })
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const createdChat = await tx.chat.create({
        data: {
          isGroup,
          name: isGroup ? name.trim() : chatName,
          image: isGroup ? image.trim() : null,
        },
      })

      const membersData = finalMembers.map((memberId) => ({
        memberId,
        chatId: createdChat.id,
      }))

      await tx.chatMember.createMany({
        data: membersData,
        skipDuplicates: true,
      })

      await tx.chatMember.update({
        where: {
          memberId_chatId: {
            memberId: userPayload.sub,
            chatId: createdChat.id,
          }
        },
        data: {
          role: "admin"
        }
      })

      return createdChat
    })


    const newCreatedChat = await prisma.chat.findUnique({
      where: { id: created.id },
      include: {
        chatMembers: {
          select: {
            memberId: true,
            role: true,
            joinedAt: true,
            member: { select: { id: true, username: true, image: true } },
          },
        },
      },
    })

    return NextResponse.json({ data: newCreatedChat }, { status: 201 })

  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}