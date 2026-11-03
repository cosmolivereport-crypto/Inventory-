import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY","ACCOUNTANT"]);if(denied(auth))return auth;
 try{
  const balances=await prisma.stockBalance.findMany({include:{product:{include:{category:true,brand:true,unit:true}},warehouse:true,batch:true},orderBy:[{product:{name:"asc"}},{warehouse:{name:"asc"}}]});
  const header=["SKU","Barcode","Product","Category","Brand","Warehouse","Batch","Expiry date","Quantity","Unit","Cost price","MRP","Stock value"];
  const rows=balances.map(b=>[b.product.sku,b.product.barcode??"",b.product.name,b.product.category?.name??"",b.product.brand?.name??"",b.warehouse.name,b.batch?.batchNumber??"",b.batch?.expiryDate?.toISOString().slice(0,10)??"",Number(b.quantity),b.product.unit?.symbol??"PCS",Number(b.product.costPrice),Number(b.product.mrp),Number(b.quantity)*Number(b.product.costPrice)]);
  const csv=[header,...rows].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\r\n");
  return new NextResponse("\uFEFF"+csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="cosmo-stock-valuation.csv"',"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Could not export stock valuation"},{status:503});}
}
