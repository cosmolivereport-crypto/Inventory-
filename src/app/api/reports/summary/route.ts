import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
const indiaDateKey=(value:Date)=>{const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);const y=p.find(x=>x.type==="year")?.value??"0000",m=p.find(x=>x.type==="month")?.value??"00",d=p.find(x=>x.type==="day")?.value??"00";return y+"-"+m+"-"+d;};
export async function GET(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","ACCOUNTANT"]);if(denied(auth))return auth;
 try{
  const now=new Date(),todayKey=indiaDateKey(now),cutoffKey=indiaDateKey(new Date(now.getTime()+90*86400000));
  const [productRows,balances,sales,purchases,expenses,receivables,payables,salesReturns,purchaseReturns]=await Promise.all([
   prisma.product.findMany({where:{active:true},select:{id:true,reorderLevel:true,stockBalances:{select:{quantity:true}}}}),
   prisma.stockBalance.findMany({include:{product:true,batch:true}}),
   prisma.sale.aggregate({where:{status:"APPROVED"},_sum:{grandTotal:true}}),
   prisma.purchase.aggregate({where:{status:"RECEIVED"},_sum:{grandTotal:true}}),
   prisma.expense.aggregate({_sum:{amount:true}}),
   prisma.sale.aggregate({where:{status:"APPROVED"},_sum:{grandTotal:true,paidAmount:true}}),
   prisma.purchase.aggregate({where:{status:"RECEIVED"},_sum:{grandTotal:true,paidAmount:true}}),
   prisma.returnDocument.aggregate({where:{kind:"SALES_RETURN",status:"APPROVED"},_sum:{grandTotal:true}}),
   prisma.returnDocument.aggregate({where:{kind:"PURCHASE_RETURN",status:"APPROVED"},_sum:{grandTotal:true}})
  ]);
  const quantities=productRows.map(p=>({quantity:p.stockBalances.reduce((s,b)=>s+Number(b.quantity),0),reorder:Number(p.reorderLevel)}));
  const expiringWithin90Days=balances.filter(b=>Number(b.quantity)>0&&b.batch?.expiryDate&&indiaDateKey(b.batch.expiryDate)>=todayKey&&indiaDateKey(b.batch.expiryDate)<=cutoffKey).length;
  const stockValue=balances.reduce((s,b)=>s+Number(b.quantity)*Number(b.batch?.costPrice??b.product.costPrice),0);
  return NextResponse.json({
   products:productRows.length,stockUnits:quantities.reduce((s,x)=>s+x.quantity,0),stockValue,
   lowStock:quantities.filter(x=>x.quantity>0&&x.quantity<=x.reorder).length,
   outOfStock:quantities.filter(x=>x.quantity<=0).length,expiringWithin90Days,
   sales:Number(sales._sum.grandTotal??0),purchases:Number(purchases._sum.grandTotal??0),
   expenses:Number(expenses._sum.amount??0),
   receivables:Math.max(0,Number(receivables._sum.grandTotal??0)-Number(receivables._sum.paidAmount??0)-Number(salesReturns._sum.grandTotal??0)),
   customerCredit:Math.max(0,Number(salesReturns._sum.grandTotal??0)+Number(receivables._sum.paidAmount??0)-Number(receivables._sum.grandTotal??0)),
   payables:Math.max(0,Number(payables._sum.grandTotal??0)-Number(payables._sum.paidAmount??0)-Number(purchaseReturns._sum.grandTotal??0)),
   supplierCredit:Math.max(0,Number(purchaseReturns._sum.grandTotal??0)+Number(payables._sum.paidAmount??0)-Number(payables._sum.grandTotal??0)),
   salesReturns:Number(salesReturns._sum.grandTotal??0),purchaseReturns:Number(purchaseReturns._sum.grandTotal??0),
   asOf:now.toISOString(),timezone:"Asia/Kolkata"
  });
 }catch{return NextResponse.json({error:"Could not calculate inventory summary"},{status:503});}
}
