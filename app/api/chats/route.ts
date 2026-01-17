import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth"


export async function GET(req: Request) {
  try {
    const currentUserId = await getCurrUserId(req)
    const chatsFound = await prisma.chat.findMany({
      where: {
        chatMembers: {
          some: {
            memberId: currentUserId
          }
        }
      },
      include: {
        chatMembers: {
          include: {
            member: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy:{
            joinedAt: "desc"
          }
        },
      },
      orderBy: {
        lastMessageAt: "desc"
      }
    })


    const formattedChats = chatsFound.map((chat) => {
      const members = chat.chatMembers.map((chatMember) => chatMember.member);

      if (members.length === 2 && !chat.isGroup) {
        const otherUser = members.find((member) => member.id !== currentUserId);

        return {
          id: chat.id,
          name: otherUser?.username ?? "Unknown User",
          image: otherUser?.image ?? null,
          lastMessage: chat.lastMessage,
          lastMessageAt: chat.lastMessageAt,
          isGroup: false,
        };
      }


      return {
        id: chat.id,
        name: chat.name ?? "Group Chat",
        image: chat.image ?? null,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        isGroup: true,
      };
    });

    return NextResponse.json({ data: formattedChats });

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
    const currentUserId = await getCurrUserId(req)

    const { name, id, image } = await req.json()
    let isGroup = false


    if (!id || !Array.isArray(id) || id.length === 0) {
      return NextResponse.json(
        { msg: "Need People to Chat" },
        { status: 400 }
      )
    }





    const memberIds = id
    memberIds.push(String(currentUserId))

    if (memberIds.length >= 3) {
      isGroup = true
    }

    const finalMembers = memberIds.map(String)



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
        return NextResponse.json({ chat: existing }, { status: 400 })
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
            memberId: currentUserId,
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

