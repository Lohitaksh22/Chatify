import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth";

export async function POST() {
  try {
    const cookie = await cookies()
    const refreshToken = cookie.get("refreshToken")?.value

    if (!refreshToken) {
      return NextResponse.json(
        { msg: "No refresh token found" },
        { status: 401 }
      )
    }

    const decoded = verifyRefreshToken(refreshToken)

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    })

    if (!user || !user.refreshToken) {
      return NextResponse.json(
        { msg: "Invalid Refresh Token" },
        { status: 401 }
      )
    }

    const comparePassword = await bcrypt.compare(refreshToken, user.refreshToken)

    if (!comparePassword) {
      return NextResponse.json(
        { msg: "Token MisMatch" },
        { status: 401 }
      )
    }

    const newAccessToken = signAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    const newRefreshToken = signRefreshToken({
      id: user.id,
      email: user.email,
      username: user.username,
    })

    const hashedRefresh = await bcrypt.hash(newRefreshToken, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh },
    })
    const res = NextResponse.json({accessToken: newAccessToken })

    res.cookies.set({
      name: "refreshToken",
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60 * 60,
      sameSite: "lax",
    })

    return res



  } catch (err) {
    console.error(err)
    return NextResponse.json({ msg: "Invalid refresh token" }, { status: 401 })
  }
}