import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";


export async function GET(req: Request, {params}: {params: { chatId: string}}){
  try{
     const userPayload = await requireUser()
    if (!userPayload) {
      return NextResponse.json(
        { msg: "Unauthorized User" },
        { status: 401 }
      )
    }

    const {chatId} = params
   
    const res = await prisma.chat.findUnique({
      where: {id: chatId},
      include: {
        chatMembers: {
          select: {
            memberId: true,
            role: true,
            joinedAt: true,
            member: { select: { id: true, username: true, image: true } }
          }
        }
      }
    })

    if(!res){
      return NextResponse.json(
        {msg: "Chat Not Found"},
        {status: 404}
      )
    }

    const isMember = res.chatMembers.some(
      cm => cm.memberId === userPayload.sub
    )

    if(!isMember){
      return NextResponse.json(
        {msg: "Forbidden"},
        {status: 403}
      )
    }

    return NextResponse.json(
      {data: res},
      {status: 200}
    )

  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req:Request , {params}: {params: {chatId: string}}) {
  try{
      const userPayload = await requireUser()
    if (!userPayload) {
      return NextResponse.json(
        { msg: "Unauthorized User" },
        { status: 401 }
      )
    }

    const {chatId} = params
    
    const currUser = await prisma.chatMember.findUnique({
      where: {
        memberId_chatId: {
         memberId: userPayload.sub, 
         chatId
      }}
  
    })

    if(currUser?.role === "member" || !currUser){
      return NextResponse.json(
        {msg: "Forbidden"},
        {status: 403}
      )
    } 

    await prisma.chat.delete({
      where: {id: chatId}
    })  
    return NextResponse.json(
      {msg: "Chat deleted successfully"},
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