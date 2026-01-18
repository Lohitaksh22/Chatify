import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth"


export async function GET(req: NextRequest) {
  try {
    const currentUserId = await getCurrUserId(req)

    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get("keyword") ?? ""

    if (!keyword || !String(keyword)) {
      return NextResponse.json(
        { msg: "Need a Valid Keyword" },
        { status: 404 }
      )
    }

    const limit = Number(searchParams.get("limit") ?? 20)
    const page = Math.max(0, Number(searchParams.get("page") ?? 0))
    const take = Math.min(Math.max(1, limit), 100)
    const skip = page * take

    const chatsFound = await prisma.chat.findMany({
      where: {
        AND: [
          { chatMembers: { some: { memberId: currentUserId } } },
          {
            OR: [
              {
                name: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
              {
                lastMessage: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
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
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take
    })

    if (!chatsFound || chatsFound.length === 0) {
      return NextResponse.json(
        { msg: "No Chats Found" },
        { status: 404 }
      )
    }

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