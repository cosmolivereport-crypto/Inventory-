import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(req:NextRequest){
 try{
  const fromParam=req.nextUrl.searchParams.get("from"),toParam=req.nextUrl.searchParams.get("to");
  const from=fromParam?new Date(fromParam+"T00:00:00.000Z"):new Date("2000-01-01T00:00:00.000Z");
  const to=toParam?new Date(toParam+"T23:59:59.999Z"):new Date();
  if(Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||from>to)return NextResponse.json({error:"Invalid report date range"},{status:400});
  const [sales,saleLines,expenses,salesReturns,returnedLines,purchases,purchaseReturns]=await Promise.all([
   prisma.sale.aggregate({where:{status:"APPROVED",invoiceDate:{gte:from,lte:to}},_sum:{grandTotal:true,subtotal:true,taxTotal:true,discount:true}}),
   prisma.saleItem.findMany({where:{sale:{status:"APPROVED",invoiceDate:{gte:from,lte:to}}},include:{product:true,batch:true}}),
   prisma.expense.aggregate({where:{date:{gte:from,lte:to}},_sum:{amount:true}}),
   prisma.returnDocument.aggregate({where:{kind:"SALES_RETURN",status:"APPROVED",createdAt:{gte:from,lte:to}},_sum:{grandTotal:true}}),
   prisma.returnItem.findMany({where:{returnDocument:{is:{kind:"SALES_RETURN",status:"APPROVED",createdAt:{gte:from,lte:to}}}},include:{product:true,batch:true}}),
   prisma.purchase.aggregate({where:{status:"RECEIVED",invoiceDate:{gte:from,lte:to}},_sum:{grandTotal:true}}),
   prisma.returnDocument.aggregate({where:{kind:"PURCHASE_RETURN",status:"APPROVED",createdAt:{gte:from,lte:to}},_sum:{grandTotal:true}})
  ]);
  const cogs=saleLines.reduce((s,x)=>s+Number(x.quantity)*Number(x.unitCost),0);
  const returnedCogs=returnedLines.reduce((s,x)=>s+Number(x.quantity)*Number(x.batch?.costPrice??x.product.costPrice),0);
  const revenue=Number(sales._sum.grandTotal??0)-Number(salesReturns._sum.grandTotal??0);
  const netCogs=Math.max(0,cogs-returnedCogs);
  const grossProfit=revenue-netCogs;
  const operatingExpenses=Number(expenses._sum.amount??0);
  return NextResponse.json({
   period:{from:from.toISOString(),to:to.toISOString()},
   grossSales:Number(sales._sum.grandTotal??0),salesReturns:Number(salesReturns._sum.grandTotal??0),
   netRevenue:revenue,purchaseBills:Number(purchases._sum.grandTotal??0),
   purchaseReturns:Number(purchaseReturns._sum.grandTotal??0),
   costOfGoodsSold:netCogs,grossProfit,operatingExpenses,netProfit:grossProfit-operatingExpenses,
   grossMarginPercent:revenue>0?grossProfit/revenue*100:0,
   sourceNote:"COGS uses batch purchase cost where available, otherwise product master cost. Expenses include entries recorded in the selected period."
  });
 }catch{return NextResponse.json({error:"Could not calculate profit and loss report"},{status:503});}
}
