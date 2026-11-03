import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY","STAFF"]);if(denied(auth))return auth;const productId=req.nextUrl.searchParams.get("productId")||undefined;const warehouseId=req.nextUrl.searchParams.get("warehouseId")||undefined;const data=await prisma.stockMovement.findMany({where:{...(productId?{productId}:{}),...(warehouseId?{warehouseId}:{})},include:{product:true,warehouse:true,batch:true},orderBy:{createdAt:"desc"},take:500});return NextResponse.json({data});}
