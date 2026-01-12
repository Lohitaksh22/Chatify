import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth"


export async function GET(req: Request) {
  try {
    const userId = await getCurrUserId(req)
    


    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get("keyword") ?? ""
    const exclude = searchParams.get("exclude")

    const excludeIds = exclude ? exclude.split(",").map((id) => id.trim()): [];

    if (!keyword || !String(keyword)) {
      return NextResponse.json(
        { msg: "Need a Valid Keyword" },
        { status: 404 }
      )
    }

    const limit = Number(searchParams.get("limit") ?? 10)
    const page = Math.max(0, Number(searchParams.get("page") ?? 0))
    const take = Math.min(Math.max(1, limit), 100)
    const skip = page * take

    const usersFound = await prisma.user.findMany({
      where: {


        username: {
          contains: keyword,
          mode: "insensitive",
        },


        id: {
          notIn: excludeIds,
          not: userId
        },


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