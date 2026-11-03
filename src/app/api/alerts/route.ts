import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(){
 try{
  const now=new Date(),cutoff=new Date(now.getTime()+90*24*60*60*1000),deadSince=new Date(now.getTime()-90*24*60*60*1000);
  const products=await prisma.product.findMany({where:{active:true},include:{category:true,stockBalances:{include:{warehouse:true,batch:true}}},orderBy:{name:"asc"}});
  const productIds=products.map(p=>p.id);
  const recentSales=await prisma.stockMovement.findMany({where:{productId:{in:productIds},type:"SALE",createdAt:{gte:deadSince}},select:{productId:true},distinct:["productId"]});
  const sold=new Set(recentSales.map(x=>x.productId));
  const rows=products.map(p=>({productId:p.id,sku:p.sku,name:p.name,category:p.category?.name??"Uncategorised",reorderLevel:Number(p.reorderLevel),quantity:p.stockBalances.reduce((s,b)=>s+Number(b.quantity),0),stockValue:p.stockBalances.reduce((s,b)=>s+Number(b.quantity)*Number(p.costPrice),0)}));
  const lowStock=rows.filter(x=>x.quantity>0&&x.quantity<=x.reorderLevel);
  const outOfStock=rows.filter(x=>x.quantity<=0);
  const expiring=products.flatMap(p=>p.stockBalances.filter(b=>Number(b.quantity)>0&&b.batch?.expiryDate&&b.batch.expiryDate>=now&&b.batch.expiryDate<=cutoff).map(b=>({productId:p.id,sku:p.sku,name:p.name,warehouse:b.warehouse.name,batch:b.batch?.batchNumber,expiry:b.batch?.expiryDate,quantity:Number(b.quantity)}))).sort((a,b)=>new Date(a.expiry!).getTime()-new Date(b.expiry!).getTime());
  const expired=products.flatMap(p=>p.stockBalances.filter(b=>Number(b.quantity)>0&&b.batch?.expiryDate&&b.batch.expiryDate<now).map(b=>({productId:p.id,sku:p.sku,name:p.name,warehouse:b.warehouse.name,batch:b.batch?.batchNumber,expiry:b.batch?.expiryDate,quantity:Number(b.quantity)})));
  const deadStock=rows.filter(x=>x.quantity>0&&!sold.has(x.productId));
  return NextResponse.json({asOf:now.toISOString(),lowStock,outOfStock,expiring,expired,deadStock});
 }catch{return NextResponse.json({error:"Could not calculate inventory alerts"},{status:503});}
}
