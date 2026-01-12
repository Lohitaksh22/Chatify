import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrUserId } from "@/lib/auth";
import { Prisma } from "@/app/generated/prisma";


export async function GET(req: Request, { params }: { params: { chatId: string } }) {
  try {
    const currentUserId = await getCurrUserId(req)
    const { chatId } = await params



    const chatFound = await prisma.chat.findUnique({
      where: { id: chatId },
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
     
    });

    if (!chatFound) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    const attachmentsFound = await prisma.attachment.findMany({
      where: {message: {chatId}},
      orderBy: { message: { createdAt: "desc" } },
    })

    const isMember = chatFound.chatMembers.some(cm => cm.memberId === currentUserId);
    if (!isMember) {
      return NextResponse.json({ message: "Not authorized to view this chat" }, { status: 403 });
    }

    const members =
      chatFound.chatMembers?.map(cm => ({
        memberId: cm.memberId,          
        joinedAt: cm.joinedAt ??  null, 
        role: cm.role ?? "member",      
        id: cm.member.id,
        username: cm.member.username,
        image: cm.member.image ?? null,
      })) ?? [];


    let foundChat;
    if (!chatFound.isGroup) {
      const otherUser = members.find(m => m.id !== currentUserId);
      foundChat = {
        id: chatFound.id,
        name: otherUser?.username ?? "Unknown User",
        image: otherUser?.image ?? null,
        lastMessage: chatFound.lastMessage ?? null,
        lastMessageAt: chatFound.lastMessageAt ?? null,
        isGroup: false,
      
      };
    } else {
      foundChat = {
        id: chatFound.id,
        name: chatFound.name ?? "Group Chat",
        image: chatFound.image ?? null,
        lastMessage: chatFound.lastMessage ?? null,
        lastMessageAt: chatFound.lastMessageAt ?? null,
        isGroup: true,
        members
      };
    }

    return NextResponse.json({ data: foundChat, attachmentsFound, currentUserId }, { status: 200 });


  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: { params: { chatId: string } }) {
  try {
    const currentUserId = await getCurrUserId(req)


    const { chatId } = await params

    const currUser = await prisma.chatMember.findUnique({
      where: {
        memberId_chatId: {
          memberId: currentUserId,
          chatId
        }
      }

    })

    if (currUser?.role === "member" || !currUser) {
      return NextResponse.json(
        { msg: "Forbidden" },
        { status: 403 }
      )
    }

    await prisma.chat.delete({
      where: { id: chatId }
    })
    return NextResponse.json(
      { msg: "Chat deleted successfully" },
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

export async function PATCH(req: Request, { params }: { params: { chatId: string } }) {
  try{
    const currentUserId = await getCurrUserId(req)
    const {chatId} = await params

    const currUser = await prisma.chatMember.findUnique({
      where:{
        memberId_chatId: 
        {memberId: currentUserId
        , chatId}
      }
    })

    if (currUser?.role === "member" || !currUser) {
      return NextResponse.json(
        { msg: "Forbidden" },
        { status: 403 }
      )
    }

    const chat = await prisma.chat.findUnique({
      where:{
        id: chatId
      }
    })

    if(!chat){
      return NextResponse.json({
        msg: "Chat Not Found"
      }, {status: 404})
    }

    const {name, image} = await req.json()

    const update: Prisma.ChatUpdateInput = {}

    if(name){
      update.name = name
    }

    if(image){
      update.image = image
    }

   const updatedChat = await prisma.chat.update({
      where:{
        id: chatId
      },
      data: update
      
    })

    return NextResponse.json(
      {data: updatedChat},
      {status: 200}
    )



  }catch(err){
console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}