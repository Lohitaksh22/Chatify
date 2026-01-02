import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireUser } from "@/lib/auth"


export async function GET(req: Request) {
  try {
    const userPayload = await requireUser()
    if (!userPayload) {
      return NextResponse.json(
        { msg: "Unauthorized User" },
        { status: 401 }
      )
    } 
  
    const {searchParams} = new URL(req.url)
    const keyword = searchParams.get("keyword") ?? ""

    if(!keyword || !String(keyword)){
      return NextResponse.json(
        {msg: "Need a Valid Keyword"},
        {status: 404}
      )
    }

    const limit = Number(searchParams.get("limit") ?? 20)
    const page = Math.max(0, Number(searchParams.get("page") ?? 0))
    const take = Math.min(Math.max(1, limit), 100)
    const skip = page * take

    const chatsFound = await prisma.chat.findMany({
      where: {
       OR: [ {name: {
          contains: keyword,
          mode: "insensitive"
        }},
        {lastMessage: {
          contains: keyword,
          mode: "insensitive"
        }}]
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take
    })

    if(!chatsFound || chatsFound.length === 0){
      return NextResponse.json(
        {msg: "No Chats Found"},
        {status: 404}
      )
    }

    return NextResponse.json(
      {data: chatsFound},
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