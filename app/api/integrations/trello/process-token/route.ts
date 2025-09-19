import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request:NextRequest){
    const {userId}=await auth()
    const {token} = await request.json();

    if(!userId || !token){
        return NextResponse.json({error:"missing user id or token"},{status:400})
    }
    try{
        await prisma.userIntegration.upsert({
            where:{
                userId_platform:{
                    userId,
                    platform:'trello'
                }
            },
            update:{
                accessToken:token,
                updatedAt:new Date(),
            },
            create:{
                userId,
                platform:'trello',
                accessToken:token,
            }
        })
        return NextResponse.json({message:"Trello token processed",success:true})
    } catch (error) {
        console.log('trello process token error',error)
        return NextResponse.json({error:"Internal server error"},{status:500})
    }
}