import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(req:NextRequest) {
  try {
    const warehouseId=req.nextUrl.searchParams.get("warehouseId")||undefined;
    const rows=await prisma.stockBalance.findMany({where:warehouseId?{warehouseId}:{},include:{product:{include:{category:true,brand:true}},warehouse:true,batch:true},orderBy:{updatedAt:"desc"}});
    const data=rows.map(r=>({id:r.id,sku:r.product.sku,name:r.product.name,category:r.product.category?.name??"Uncategorised",warehouse:r.warehouse.name,batch:r.batch?.batchNumber??null,expiry:r.batch?.expiryDate??null,quantity:Number(r.quantity),reorderLevel:Number(r.product.reorderLevel),unitCost:Number(r.product.costPrice),stockValue:Number(r.quantity)*Number(r.product.costPrice)}));
    return NextResponse.json({data,summary:{totalUnits:data.reduce((a,b)=>a+b.quantity,0),stockValue:data.reduce((a,b)=>a+b.stockValue,0),lowStock:data.filter(x=>x.quantity>0&&x.quantity<=x.reorderLevel).length,outOfStock:data.filter(x=>x.quantity===0).length}});
  } catch { return NextResponse.json({error:"Could not load stock balances"},{status:503}); }
}
