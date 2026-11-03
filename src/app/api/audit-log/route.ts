import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requireRole,denied} from "@/lib/authorization";
export async function GET(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","ACCOUNTANT"]);if(denied(auth))return auth;
 const limit=Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")||100),1),500);
 const data=await prisma.auditLog.findMany({include:{user:{select:{name:true,email:true,role:true}}},orderBy:{createdAt:"desc"},take:limit});
 return NextResponse.json({data});
}
