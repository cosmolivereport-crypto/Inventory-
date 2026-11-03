import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
const indiaDateKey=(value:Date)=>{const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);const y=p.find(x=>x.type==="year")?.value??"0000",m=p.find(x=>x.type==="month")?.value??"00",d=p.find(x=>x.type==="day")?.value??"00";return y+"-"+m+"-"+d;};
export async function GET(){
 try{
  const now=new Date(),todayKey=indiaDateKey(now),cutoffKey=indiaDateKey(new Date(now.getTime()+90*24*60*60*1000)),deadSince=new Date(now.getTime()-90*24*60*60*1000);
  const products=await prisma.product.findMany({where:{active:true},include:{category:true,stockBalances:{include:{warehouse:true,batch:true}}},orderBy:{name:"asc"}});
  const productIds=products.map(p=>p.id);
  const recentSales=await prisma.stockMovement.findMany({where:{productId:{in:productIds},type:"SALE",createdAt:{gte:deadSince}},select:{productId:true},distinct:["productId"]});
  const sold=new Set(recentSales.map(x=>x.productId));
  const rows=products.map(p=>({productId:p.id,sku:p.sku,name:p.name,category:p.category?.name??"Uncategorised",reorderLevel:Number(p.reorderLevel),quantity:p.stockBalances.reduce((s,b)=>s+Number(b.quantity),0),stockValue:p.stockBalances.reduce((s,b)=>s+Number(b.quantity)*Number(b.batch?.costPrice??p.costPrice),0)}));
  const lowStock=rows.filter(x=>x.quantity>0&&x.quantity<=x.reorderLevel);
  const outOfStock=rows.filter(x=>x.quantity<=0);
  const batches=products.flatMap(p=>p.stockBalances.filter(b=>Number(b.quantity)>0&&b.batch?.expiryDate).map(b=>({productId:p.id,sku:p.sku,name:p.name,warehouse:b.warehouse.name,batch:b.batch?.batchNumber,expiry:b.batch?.expiryDate??null,quantity:Number(b.quantity)})));
  const expiring=batches.filter(b=>b.expiry&&indiaDateKey(new Date(b.expiry))>=todayKey&&indiaDateKey(new Date(b.expiry))<=cutoffKey).sort((a,b)=>new Date(a.expiry!).getTime()-new Date(b.expiry!).getTime());
  const expired=batches.filter(b=>b.expiry&&indiaDateKey(new Date(b.expiry))<todayKey).sort((a,b)=>new Date(a.expiry!).getTime()-new Date(b.expiry!).getTime());
  const deadStock=rows.filter(x=>x.quantity>0&&!sold.has(x.productId));
  return NextResponse.json({asOf:now.toISOString(),timezone:"Asia/Kolkata",lowStock,outOfStock,expiring,expired,deadStock});
 }catch{return NextResponse.json({error:"Could not calculate inventory alerts"},{status:503});}
}
