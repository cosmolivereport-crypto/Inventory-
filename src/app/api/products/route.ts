import {requireRole,denied} from "@/lib/authorization";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { changeStock } from "@/lib/inventory";
const createProductSchema = z.object({
 sku:z.string().trim().min(1).max(80),name:z.string().trim().min(1).max(200),barcode:z.string().trim().optional(),
 categoryId:z.string().optional(),brandId:z.string().optional(),unitId:z.string().optional(),hsnCode:z.string().trim().optional(),
 gstRate:z.number().min(0).max(100).default(0),trackBatch:z.boolean().default(true),trackExpiry:z.boolean().default(true),costPrice:z.number().min(0),sellingPrice:z.number().min(0),
 mrp:z.number().min(0),reorderLevel:z.number().min(0).default(0),description:z.string().optional(),
 openingStock:z.number().min(0).default(0),warehouseId:z.string().optional(),batchNumber:z.string().optional(),expiryDate:z.string().optional()
});
export async function GET(req:NextRequest) {
 try {const q=req.nextUrl.searchParams.get("q")?.trim();const products=await prisma.product.findMany({where:{active:true,...(q?{OR:[{sku:{contains:q,mode:"insensitive"}},{name:{contains:q,mode:"insensitive"}}]}:{})},include:{category:true,brand:true,unit:true,stockBalances:{include:{warehouse:true,batch:true}}},orderBy:{name:"asc"}});return NextResponse.json({data:products});}
 catch{return NextResponse.json({error:"Could not load products. Check database configuration."},{status:503});}
}
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY"]);if(denied(auth))return auth;
 try{
  const input=createProductSchema.parse(await req.json());
  const {openingStock,warehouseId,batchNumber,expiryDate,...productData}=input;
  const product=await prisma.$transaction(async tx=>{
   const created=await tx.product.create({data:productData});
   if(openingStock>0){
    if(created.trackBatch&&!batchNumber)throw new Error("Batch number is required for opening stock");
    if(created.trackExpiry&&!expiryDate)throw new Error("Expiry date is required for this product");
    if(!warehouseId)throw new Error("Select a warehouse for opening stock");
    let batchId:string|undefined;
    if(batchNumber){const batch=await tx.batch.create({data:{productId:created.id,batchNumber,expiryDate:expiryDate?new Date(expiryDate):undefined,costPrice:created.costPrice}});batchId=batch.id;}
    await changeStock(tx,{productId:created.id,warehouseId,batchId,quantity:openingStock,type:"OPENING",unitCost:Number(created.costPrice),referenceType:"PRODUCT_OPENING",referenceId:created.id,notes:"Opening stock at product creation",actorId:auth.userId});
   }
   await tx.auditLog.create({data:{userId:auth.userId,action:"PRODUCT_CREATED",entity:"PRODUCT",entityId:created.id,after:{sku:created.sku,name:created.name}}});
   return created;
  },{isolationLevel:"Serializable"});
  return NextResponse.json({data:product},{status:201});
 } catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:"Invalid product data",details:error.issues},{status:400});return NextResponse.json({error:error instanceof Error?error.message:"Could not create product. Check duplicate SKU."},{status:409});}
}
