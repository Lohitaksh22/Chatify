import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt"




export async function POST(req: Request) {
  try {
    const {username, email, password, image} = await req.json()

    if(!username || !email || !password){
      return NextResponse.json(
        {msg: "Invalid Credentials"},
        {status: 400}
      )
    }

  const hashedPassword = await bcrypt.hash(password, 10)
   
  const newUser = {
      username,
      email,
      password: hashedPassword,
      ...(image && { image }),
    };

    const user = await prisma.user.create({
      data: newUser
    })

    return NextResponse.json(
      { message: "User created", user },
      { status: 201 }
    )

  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}
