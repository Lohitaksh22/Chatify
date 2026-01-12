import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: { chatId: string } }) {
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

     await tx.chatMember.deleteMany({
        where: { chatId, memberId: currentUserId },
      });

      const remaining = await tx.chatMember.count({
        where: { chatId },

      });

      

      if (remaining ===0) {
        await tx.chat.delete({ where: { id: chatId } });
        return;
      }


    });





    return NextResponse.json({
      msg: "Removed From Chat"

    }, { status: 200 })

  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

