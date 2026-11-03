import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(){
 try{
  const [products,balances,now]=await Promise.all([
   prisma.product.findMany({where:{active:true},select:{id:true,reorderLevel:true,stockBalances:{select:{quantity:true}}}}),
   prisma.stockBalance.findMany({include:{product:true,batch:true}}),
   Promise.resolve(new Date())
  ]);
  const indiaDateKey=(value:Date)=>{const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);const y=p.find(x=>x.type==="year")?.value??"0000",m=p.find(x=>x.type==="month")?.value??"00",d=p.find(x=>x.type==="day")?.value??"00";return y+"-"+m+"-"+d;};
  const today=indiaDateKey(now),cutoff=indiaDateKey(new Date(now.getTime()+90*86400000));
  const quantities=products.map(p=>({quantity:p.stockBalances.reduce((s,b)=>s+Number(b.quantity),0),reorder:Number(p.reorderLevel)}));
  const stockValue=balances.reduce((s,b)=>s+Number(b.quantity)*Number(b.batch?.costPrice??b.product.costPrice),0);
  const expiringWithin90Days=balances.filter(b=>Number(b.quantity)>0&&b.batch?.expiryDate&&indiaDateKey(b.batch.expiryDate)>=today&&indiaDateKey(b.batch.expiryDate)<=cutoff).length;
  return NextResponse.json({products:products.length,stockUnits:quantities.reduce((s,x)=>s+x.quantity,0),stockValue,lowStock:quantities.filter(x=>x.quantity>0&&x.quantity<=x.reorder).length,outOfStock:quantities.filter(x=>x.quantity<=0).length,expiringWithin90Days,asOf:now.toISOString(),timezone:"Asia/Kolkata"});
 }catch{return NextResponse.json({error:"Could not calculate inventory dashboard"},{status:503});}
}
