import {requireRole,denied} from "@/lib/authorization";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { postSale } from "@/lib/inventory";
const schema=z.object({number:z.string().min(1),warehouseId:z.string().min(1),customerId:z.string().optional(),notes:z.string().optional(),items:z.array(z.object({productId:z.string(),quantity:z.number().positive(),unitPrice:z.number().nonnegative(),discount:z.number().nonnegative().optional(),taxRate:z.number().min(0).max(100).optional(),batchId:z.string().optional()})).min(1)});
export async function GET(){const data=await prisma.sale.findMany({include:{customer:true,items:{include:{product:true}}},orderBy:{invoiceDate:"desc"},take:100});return NextResponse.json({data});}
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY","STAFF"]);if(denied(auth))return auth;
 try{const input=schema.parse(await req.json());const data=await prisma.$transaction(tx=>postSale(tx,input),{isolationLevel:"Serializable"});return NextResponse.json({data},{status:201});}catch(e){const message=e instanceof Error?e.message:"Invalid sale";return NextResponse.json({error:message},{status:400});}}
