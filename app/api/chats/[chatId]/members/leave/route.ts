import { NextResponse, NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: {  params: Promise<{ chatId: string }> }) {
  try {
    const currentUserId = await getCurrUserId(req)

    const { chatId } = await params
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
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
    await prisma.$transaction(async (tx) => {

     await tx.chatMember.delete({
       where: { memberId_chatId: { memberId: currentUserId, chatId } },
      });

      const remaining = await tx.chatMember.count({
        where: { chatId },

      });

      if (remaining === 0) {
        await tx.messageRead.deleteMany({
          where: {
            message: {chatId}
          }
        })

         await tx.attachment.deleteMany({
          where: { message: { chatId } },
        });

        await tx.messages.deleteMany({
          where: { chatId },
        });

        await tx.chat.delete({ where: { id: chatId } });
      }

  });





    return NextResponse.json({
      data: isMember

    }, { status: 200 })

  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

