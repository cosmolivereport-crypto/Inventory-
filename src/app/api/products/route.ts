import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
const createProductSchema = z.object({
  sku:z.string().trim().min(1).max(80), name:z.string().trim().min(1).max(200),
  barcode:z.string().trim().optional(), categoryId:z.string().optional(), brandId:z.string().optional(), unitId:z.string().optional(),
  hsnCode:z.string().trim().optional(), gstRate:z.number().min(0).max(100).default(0),
  costPrice:z.number().min(0), sellingPrice:z.number().min(0), mrp:z.number().min(0),
  reorderLevel:z.number().min(0).default(0), description:z.string().optional()
});
export async function GET(req:NextRequest) {
  try {
    const q=req.nextUrl.searchParams.get("q")?.trim();
    const products=await prisma.product.findMany({where:{active:true,...(q?{OR:[{sku:{contains:q,mode:"insensitive"}},{name:{contains:q,mode:"insensitive"}}]}:{})},include:{category:true,brand:true,unit:true,stockBalances:{include:{warehouse:true,batch:true}}},orderBy:{name:"asc"}});
    return NextResponse.json({data:products});
  } catch { return NextResponse.json({error:"Could not load products. Check database configuration."},{status:503}); }
}
export async function POST(req:NextRequest) {
  try {
    const input=createProductSchema.parse(await req.json());
    const product=await prisma.product.create({data:input});
    return NextResponse.json({data:product},{status:201});
  } catch(error) {
    if(error instanceof z.ZodError) return NextResponse.json({error:"Invalid product data",details:error.issues},{status:400});
    return NextResponse.json({error:"Could not create product. Check duplicate SKU and database."},{status:409});
  }
}
