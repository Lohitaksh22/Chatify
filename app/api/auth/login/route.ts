import bcrypt from "bcrypt"
import prisma from "@/lib/prisma"
import { signAccessToken, signRefreshToken } from "@/lib/auth"
import { NextResponse } from "next/server"


export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json(
        { msg: "Email and Password are required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!user) {
      return NextResponse.json({
        msg: "User not found",

      },
        { status: 404 }
      )
    }

    const comparePassword = await bcrypt.compare(password, user.password)

    if (!comparePassword) {
      return NextResponse.json(
        { msg: "Incorrect Password" },
        { status: 401 }
      )
    }

    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    const refreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    const hashedRefresh = await bcrypt.hash(refreshToken, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh },
    })
    const res = NextResponse.json({ accessToken });

    res.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      path: "/",
      maxAge: 60 * 24 * 60 * 60, 
      sameSite: "lax",
    });

    return res;




  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}
