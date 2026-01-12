import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth";

export async function PATCH(req: Request, {params}: {params: {chatId: string; messageId: string} }){
 try{
     const currentUserId = await getCurrUserId(req)

    const {chatId, messageId} = await params
    const chat = await prisma.chat.findUnique({
      where: {id: chatId},
      include: { messages: true
      }
    })

    if(!chat){
      return NextResponse.json(
        {msg: "Chat Not Found"},
        {status: 404}
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

      if(!isMember){
      return NextResponse.json(
        {msg: "Forbidden"},
        {status: 403}
      )
    }

    const message = await prisma.messages.findUnique({
      where: {id: messageId}
    })
    
    if(!(message?.senderId===currentUserId) || !(message?.chatId===chatId) ||!message){
       return NextResponse.json(
        {msg: "Forbidden"},
        {status: 403}
      )
    }

    const body = await req.json()
    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (content.length === 0) {
      return NextResponse.json({ msg: "content required" }, { status: 400 })
    }

    const res = await prisma.messages.update({
      where: {id: messageId},
      data:{
        content,
        edit: true
      },
      
      include: {
        sender: { select: { id: true, username: true, image: true } },
        attachments: true,
      }
    })

    if(!res){
      return NextResponse.json(
        {msg: "Could not Update Message"},
        {status: 404}
      )
    }

    return NextResponse.json(
      {msg: "Updated Message"},
      {status: 200}
    )


}catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req:Request, {params}: {params: {chatId: string; messageId: string}}) {
  try{
    const currentUserId = await getCurrUserId(req)

    const {chatId, messageId} = await params
    const chat = await prisma.chat.findUnique({
      where: {id: chatId},
      include: { messages: true
      }
    })

    if(!chat){
      return NextResponse.json(
        {msg: "Chat Not Found"},
        {status: 404}
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

      if(!isMember){
      return NextResponse.json(
        {msg: "Forbidden"},
        {status: 403}
      )
    }

    const message = await prisma.messages.findUnique({
      where: {id: messageId}
    })
    
    if(!(message?.senderId===currentUserId) || !(message?.chatId===chatId) ||!message){
       return NextResponse.json(
        {msg: "Forbidden"},
        {status: 403}
      )
    }

  await prisma.$transaction([
      prisma.messageRead.deleteMany({ where: { messageId } }),
      prisma.attachment.deleteMany({ where: { messageId } }),
      prisma.messages.delete({ where: { id: messageId } }),
    ])

     return NextResponse.json(
      {msg: "Message deleted successfully"},
      {status: 200}
    )

  }catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
  
}