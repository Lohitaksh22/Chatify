import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyRefreshToken } from "@/lib/auth";


export async function POST(){
  try{
    const cookie = await cookies()
     const refreshToken = cookie.get("refreshToken")?.value

    if (!refreshToken) {
      const res = NextResponse.json({ msg: "Logged out" })
      res.cookies.set({
      name: "refreshToken",
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
    })
      return res
      
    }

    const decoded = verifyRefreshToken(refreshToken)

    await prisma.user.update({
      where: { id: decoded.id },
      data: {refreshToken:null}
    })

  const res = NextResponse.json({ msg: "Logged out" })
    res.cookies.set({
      name: "refreshToken",
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
    })

    res.cookies.set({
    name: "accessToken",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })


    return res


  }catch (err) {
    console.error(err)
    return NextResponse.json({ msg: "Invalid refresh token" }, { status: 401 })
  }
}