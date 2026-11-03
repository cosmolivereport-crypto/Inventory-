import {requireRole,denied} from "@/lib/authorization";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { postPurchase } from "@/lib/inventory";
const schema=z.object({number:z.string().min(1),supplierId:z.string().min(1),warehouseId:z.string().min(1),notes:z.string().optional(),items:z.array(z.object({productId:z.string(),quantity:z.number().positive(),unitCost:z.number().nonnegative(),discount:z.number().nonnegative().optional(),taxRate:z.number().min(0).max(100).optional(),batchNumber:z.string().optional(),expiryDate:z.string().optional()})).min(1)});
export async function GET(){const data=await prisma.purchase.findMany({include:{supplier:true,items:{include:{product:true}}},orderBy:{invoiceDate:"desc"},take:100});return NextResponse.json({data});}
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY"]);if(denied(auth))return auth;
 try{const input=schema.parse(await req.json());const data=await prisma.$transaction(tx=>postPurchase(tx,input),{isolationLevel:"Serializable"});return NextResponse.json({data},{status:201});}catch(e){const message=e instanceof Error?e.message:"Invalid purchase";return NextResponse.json({error:message},{status:400});}}
