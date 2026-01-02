import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireUser } from "@/lib/auth"

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
      select: {
        id: true
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

    if (!isMember || isMember.role != "admin") {
      return NextResponse.json(
        { msg: "Forbidden" },
        { status: 403 }
      )
    }

    const { username } = await req.json()
    if (!username || !String(username)) {
      return NextResponse.json(
        { msg: "Not A Valid User" },
        { status: 404 }
      )
    }

    const user = await prisma.user.findUnique({
      where: {
        username
      }
    })

    if (!user) {
      return NextResponse.json(
        { msg: "Account Not Found" },
        { status: 404 }
      )
    }

    const exists = await prisma.chatMember.findUnique({
      where: {
        memberId_chatId: {
          memberId: user.id,
          chatId
        }
      }
    })

    if (exists) {
      return NextResponse.json(
        { msg: "User already a member" },
        { status: 404 })
    }


    await prisma.chatMember.create({
      data: {
        memberId: user.id,
        chatId
      }
    })

    return NextResponse.json(
      { msg: "Account added to Chat" },
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

export async function DELETE (req: Request, {params}: {params : {chatId: string}}){
  try{
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
      select: {
       id: true
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

    if (!isMember || isMember.role != "admin") {
      return NextResponse.json(
        { msg: "Forbidden" },
        { status: 403 }
      )
    }

    const { username } = await req.json()
    if (!username || !String(username)) {
      return NextResponse.json(
        { msg: "Not A Valid User" },
        { status: 404 }
      )
    }

    const user = await prisma.user.findUnique({
      where: {
        username
      }
    })

    if (!user) {
      return NextResponse.json(
        { msg: "Account Not Found" },
        { status: 404 }
      )
    }

   
      await prisma.chatMember.delete({
        where:{ memberId_chatId:{
          memberId: user.id,
          chatId
        }}
      })

      return NextResponse.json(
        {msg: "User deleted from Chat"},
        {status:200}
      )
     
 

  }catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request, {params}: {params: {chatId: string}}){
  try{
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
    })

    if (!chat) {
      return NextResponse.json(
        { msg: "Chat Not Found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {data: chat},
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
