import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrUserId } from "@/lib/auth"; 


export async function POST(req: NextRequest, { params }: { params: Promise<{ chatId: string }>  }) {
  try {
     const userId = await getCurrUserId(req);
     const {chatId} = await params
  }
  catch(err){

  }
}