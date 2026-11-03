import {NextRequest,NextResponse} from "next/server";
import {readSession} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import type {Session} from "@/lib/session";
export async function requireRole(req:NextRequest,allowed:string[]):Promise<Session|NextResponse>{
 const token=req.cookies.get("cosmo_session")?.value;
 if(!token)return NextResponse.json({error:"Authentication required"},{status:401});
 const session=await readSession(token);
 if(!session)return NextResponse.json({error:"Session expired. Please sign in again."},{status:401});
 const user=await prisma.user.findUnique({where:{id:session.userId},select:{id:true,email:true,role:true,active:true}});
 if(!user||!user.active)return NextResponse.json({error:"User account is disabled."},{status:401});
 if(!allowed.includes(user.role))return NextResponse.json({error:"You do not have permission to perform this action."},{status:403});
 return {userId:user.id,email:user.email,role:user.role};
}
export function denied(result:Session|NextResponse):result is NextResponse{return result instanceof NextResponse;}
