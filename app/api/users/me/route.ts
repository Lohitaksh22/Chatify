import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrUserId } from "@/lib/auth"
import bcrypt from "bcrypt"
import { Prisma } from "@/app/generated/prisma";


export async function PATCH(req: NextRequest){
  try{
 
    const userId = await getCurrUserId(req)
   
    const user = await prisma.user.findUnique({
      where: {id: userId}
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

    if(!password && !image && !username && !email){
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    
    
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

export async function GET(req: NextRequest) {
  try{
    const userId = await getCurrUserId(req)
   
    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: {
        email: true,
        image: true,
        username: true,
      }
    })

    if(!user){
       return NextResponse.json(
        {msg: "Unauthorized User"},
        {status: 401}
      )
    }

    return NextResponse.json(
        {data: user},
        {status: 200}
      )

  }catch(err){
    console.error(err);
     return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  
    
  }
}

export async function POST(req: NextRequest) {
  try{
     const userId = await getCurrUserId(req)
   
    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: {
        email: true,
        image: true,
        username: true,
        password: true
      }
    })

    if(!user){
       return NextResponse.json(
        {msg: "Unauthorized User"},
        {status: 401}
      )
    }

    const {password} = await req.json()

    const compare = await bcrypt.compare(password, user.password)

    if(!compare){
      return NextResponse.json(
      { message: "Incorrect Password" },
      { status: 400 }
    )
    }

    return NextResponse.json(
      { message: "Correct Password" },
      { status: 200 }
    )


  }catch(err){
    console.error(err);
     return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  
    
  }
}