import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import bcrypt from "bcrypt"
import { Prisma } from "@/app/generated/prisma";


export async function PATCH(req: Request){
  try{
    const Payload = await requireUser()
    if(!Payload){
      return NextResponse.json(
        {msg:"Unauthorized User"},
        {status:401}
      )
    }
    const user = await prisma.user.findUnique({
      where: {id: Payload.sub}
    })

    if(!user){
       return NextResponse.json(
        {msg: "Unauthorized User"},
        {status: 401}
      )
    }
    const {email, password, image, username} = await req.json()

    const updates:  Prisma.UserUpdateInput = {}

    if(password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.password = hashedPassword
    }

    if (email) updates.email = email
    if (image) updates.image = image
    if (username) updates.username = username
    
    const res = await prisma.user.update({
      where: {id: user.id},
      data: updates
    })

    if(res){
      return NextResponse.json(
        {msg: "Account Updated Successfully"},
        {status: 200}
      )
    }

  }catch(err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}