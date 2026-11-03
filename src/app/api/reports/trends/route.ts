import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(){
 try{
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth()-5,1);
  const [sales,purchases]=await Promise.all([
   prisma.sale.findMany({where:{status:"APPROVED",invoiceDate:{gte:start}},select:{invoiceDate:true,grandTotal:true}}),
   prisma.purchase.findMany({where:{status:"RECEIVED",invoiceDate:{gte:start}},select:{invoiceDate:true,grandTotal:true}})
  ]);
  const months=Array.from({length:6},(_,i)=>{const d=new Date(start.getFullYear(),start.getMonth()+i,1);return {key:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"),name:d.toLocaleString("en-IN",{month:"short"}),sales:0,purchases:0};});
  const map=new Map(months.map(x=>[x.key,x]));
  for(const x of sales){const key=x.invoiceDate.getFullYear()+"-"+String(x.invoiceDate.getMonth()+1).padStart(2,"0");const m=map.get(key);if(m)m.sales+=Number(x.grandTotal);}
  for(const x of purchases){const key=x.invoiceDate.getFullYear()+"-"+String(x.invoiceDate.getMonth()+1).padStart(2,"0");const m=map.get(key);if(m)m.purchases+=Number(x.grandTotal);}
  return NextResponse.json({data:months,asOf:now.toISOString()});
 }catch{return NextResponse.json({error:"Could not build monthly sales and purchase trend"},{status:503});}
}
