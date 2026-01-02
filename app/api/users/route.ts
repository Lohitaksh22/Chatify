import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireUserFromRequest } from "@/lib/auth"


export async function GET(req: Request) {
  try {
    
    

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

    const usersFound = await prisma.user.findMany({
      where: {
        AND: [
          {
            username: {
              contains: keyword,
              mode: "insensitive",
            },
          },
          {
            id: {
              
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip,
      take
    })

    if (!usersFound || usersFound.length === 0) {
      return NextResponse.json(
        { msg: "No users Found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: usersFound },
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