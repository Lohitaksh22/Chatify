import { NextRequest,NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrUserId } from "@/lib/auth";
import { ChatMember } from "@/app/generated/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }>  }) {
  try {
    const userId = await getCurrUserId(req)
    const {chatId} = await params
    


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

    const limit = Number(searchParams.get("limit") ?? 20)
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

    const chat = await prisma.chat.findUnique({
      where:{
        id: chatId
      },
      include:{
        chatMembers: true
      }
    })

    if (!chat) {
      return NextResponse.json(
        { msg: "Chat Not Found" },
        { status: 404 }
      )
    }

    const members = chat.chatMembers.map((chatMember) => chatMember.memberId)
    const filteredUsers = usersFound.filter(
  (user) => !members.includes(user.id)
)


    return NextResponse.json(
      { data: filteredUsers },
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


export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }>  }) {
  try {
       const currentUserId = await getCurrUserId(req)

    const { chatId } = await params
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
          memberId: currentUserId,
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

    const body = await req.json()
    const usernames = body.usernames
     

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json(
        { msg: "Need Users to add to Chat" },
        { status: 400 }
      )
    }

    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { username: true } });
    const filtered = usernames.filter((u) => u !== currentUser?.username);
    if (filtered.length === 0) {
      return NextResponse.json({ msg: "No other users to add" }, { status: 400 });
    }

 const foundUsers = await prisma.user.findMany({
      where: { username: { in: filtered } },
      select: { id: true, username: true },
    });

    const foundByUsername = new Map(foundUsers.map(u => [u.username, u.id]));

    const added: ChatMember[] = [];
    const alreadyMembers: string[] = [];

    for (const username of filtered) {
      const userId = foundByUsername.get(username);
      if (!userId) continue; 

      const exists = await prisma.chatMember.findUnique({
        where: { memberId_chatId: { memberId: userId, chatId } },
      });

      if (exists) {
        alreadyMembers.push(username);
        continue;
      }

     const newMember= await prisma.chatMember.create({
        data: { memberId: userId, chatId },
      });

      added.push(newMember);
    }

    

    return NextResponse.json(
      {data: added},
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  try {
    const currentUserId = await getCurrUserId(req)
    const { chatId } = await params
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
          memberId: currentUserId,
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

      const isAdminMember = await prisma.chatMember.findUnique({
      where: {
        memberId_chatId: {
          memberId: user.id,
          chatId
        }
      }
    }
    )
    if(isAdminMember?.role === "admin"){
      return NextResponse.json({
        msg: "Can not Remove an Admin"
      }, {status:400})
    }

    
 await prisma.$transaction(async (tx) => {
      
      await tx.chatMember.deleteMany({
        where: {
           memberId: user.id, chatId ,
        },
      });

      
      const remainingMembers = await tx.chatMember.findMany({
        where: { chatId },
        
      });

      const remainingCount = remainingMembers.length;

      if (remainingCount === 0) {
       
        await tx.chat.delete({ where: { id: chatId } });
        return;
      }

      if (remainingCount === 2) {
        
        await tx.chat.update({
          where: { id: chatId },
          data: {
            isGroup: true,
          
          },
        });
   
      }

      
      await tx.chat.update({
        where: { id: chatId },
        data: {
          isGroup: true,
         
        },
      });
     
    });

    
    return NextResponse.json({data: isAdminMember }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, {params}: {params: Promise<{ chatId: string }> }){
  try{
       const currentUserId = await getCurrUserId(req)

    const { chatId } = await params
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
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
          memberId: currentUserId,
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
    
    const body = await req.json()
    const username = typeof body.username === "string" ? body.username.trim() : ""
    
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

    const isAdmin = await prisma.chatMember.findUnique({
      where: {memberId_chatId:{
        memberId: user.id,
        chatId
      }}
    })

    if(isAdmin?.role === "admin"){
      return NextResponse.json({
        msg: "Already Admin"
      }, {status: 400})
    }

   const result = await prisma.chatMember.update({
        where:{ memberId_chatId:{
          memberId: user.id,
          chatId
        }},
        data:{
          role: "admin"
        },
        include:{
          member: true

        }
      })

       return NextResponse.json(
      { data: result },
      { status: 200 }
    )
    
  }catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}
