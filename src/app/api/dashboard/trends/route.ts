import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(){
 try{
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth()-5,1);
  const rows=await prisma.stockMovement.findMany({where:{createdAt:{gte:start}},select:{createdAt:true,quantity:true}});
  const months=Array.from({length:6},(_,i)=>{const d=new Date(start.getFullYear(),start.getMonth()+i,1);return {key:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"),name:d.toLocaleString("en-IN",{month:"short"}),stockIn:0,stockOut:0};});
  const map=new Map(months.map(x=>[x.key,x]));
  for(const row of rows){const key=row.createdAt.getFullYear()+"-"+String(row.createdAt.getMonth()+1).padStart(2,"0");const month=map.get(key);if(!month)continue;const qty=Number(row.quantity);if(qty>0)month.stockIn+=qty;else month.stockOut+=Math.abs(qty);}
  return NextResponse.json({data:months,asOf:now.toISOString()});
 }catch{return NextResponse.json({error:"Could not calculate stock movement trend"},{status:503});}
}
