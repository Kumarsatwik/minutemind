import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(){
    try {
        const {userId} = await auth();
        if(!userId){
            return NextResponse.json({error:"Not authorized"},{status:401})
        }
        await prisma.user.update({
            where:{ 
                clerkId:userId
            },
            data:{
                calendarConnected:false,
                googleAccessToken:null,
                googleRefreshToken:null,
            }
        })
        return NextResponse.json({message:"Google Calendar Disconnected",success:true})
    } catch (error) {
        console.log('disconnect error',error)
        return NextResponse.json({error:"Internal server error"},{status:500})
    }
}