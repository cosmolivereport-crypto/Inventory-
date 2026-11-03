import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {changeStock} from "@/lib/inventory";
import {requireRole,denied} from "@/lib/authorization";
const schema=z.object({
 kind:z.enum(["SALES_RETURN","PURCHASE_RETURN"]),
 number:z.string().min(1).max(80),
 warehouseId:z.string().min(1),
 sourceSaleId:z.string().optional(),
 sourcePurchaseId:z.string().optional(),
 notes:z.string().optional(),
 items:z.array(z.object({
  productId:z.string(),batchId:z.string().optional(),
  quantity:z.number().positive(),unitValue:z.number().nonnegative(),
  taxRate:z.number().min(0).max(100).default(0)
 })).min(1)
}).superRefine((v,ctx)=>{
 if(v.kind==="SALES_RETURN"&&!v.sourceSaleId)ctx.addIssue({code:"custom",message:"Select the original sales invoice.",path:["sourceSaleId"]});
 if(v.kind==="PURCHASE_RETURN"&&!v.sourcePurchaseId)ctx.addIssue({code:"custom",message:"Select the original purchase bill.",path:["sourcePurchaseId"]});
});
export async function GET(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY","STAFF"]);if(denied(auth))return auth;
 try{
  const data=await prisma.returnDocument.findMany({where:auth.role==="STAFF"?{kind:"SALES_RETURN"}:{},include:{customer:true,supplier:true,warehouse:true,sourceSale:true,sourcePurchase:true,items:{include:{product:true,batch:true}}},orderBy:{createdAt:"desc"},take:200});
  return NextResponse.json({data});
 }catch{return NextResponse.json({error:"Could not load return documents"},{status:503});}
}
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY","STAFF"]);if(denied(auth))return auth;
 try{
  const input=schema.parse(await req.json());
  if(input.kind==="PURCHASE_RETURN"&&auth.role==="STAFF")return NextResponse.json({error:"Purchase returns require inventory or finance role."},{status:403});
  if(input.kind==="SALES_RETURN"&&input.sourcePurchaseId)throw new Error("Sales return cannot reference a purchase bill.");
  if(input.kind==="PURCHASE_RETURN"&&input.sourceSaleId)throw new Error("Purchase return cannot reference a sales invoice.");
  const data=await prisma.$transaction(async tx=>{
   const sourceSale=input.sourceSaleId?await tx.sale.findUnique({where:{id:input.sourceSaleId},include:{items:true}}):null;
   const sourcePurchase=input.sourcePurchaseId?await tx.purchase.findUnique({where:{id:input.sourcePurchaseId},include:{items:true}}):null;
   if(input.kind==="SALES_RETURN"&&!sourceSale)throw new Error("Original sales invoice was not found.");
   if(input.kind==="PURCHASE_RETURN"&&!sourcePurchase)throw new Error("Original purchase bill was not found.");
   if(sourceSale&&sourceSale.status!=="APPROVED")throw new Error("Only approved sales invoices can be returned.");
   if(sourcePurchase&&sourcePurchase.status!=="RECEIVED")throw new Error("Only received purchase bills can be returned.");
   const lines=[];
   for(const item of input.items){
    const product=await tx.product.findUnique({where:{id:item.productId}});
    if(!product||!product.active)throw new Error("Product is missing or inactive.");
    let originalQty:number|undefined;
    let unitCost=Number(product.costPrice);
    if(sourceSale){
      const originals=sourceSale.items.filter(x=>x.productId===item.productId&&(x.batchId??null)===(item.batchId??null));
      if(!originals.length)throw new Error("A sales return item must match a product and batch on the original invoice.");
      const soldQuantity=originals.reduce((s,x)=>s+Number(x.quantity),0);
      const previous=await tx.returnItem.aggregate({where:{productId:item.productId,batchId:item.batchId??null,returnDocument:{is:{kind:"SALES_RETURN",sourceSaleId:sourceSale.id,status:"APPROVED"}}},_sum:{quantity:true}});
      originalQty=soldQuantity-Number(previous._sum.quantity??0);
      unitCost=originals.reduce((s,x)=>s+Number(x.quantity)*Number(x.unitCost),0)/soldQuantity;
    }
    if(sourcePurchase){
      const originals=sourcePurchase.items.filter(x=>x.productId===item.productId&&(x.batchId??null)===(item.batchId??null));
      if(!originals.length)throw new Error("A purchase return item must match a product and batch on the original bill.");
      const receivedQuantity=originals.reduce((s,x)=>s+Number(x.receivedQuantity),0);
      const previous=await tx.returnItem.aggregate({where:{productId:item.productId,batchId:item.batchId??null,returnDocument:{is:{kind:"PURCHASE_RETURN",sourcePurchaseId:sourcePurchase.id,status:"APPROVED"}}},_sum:{quantity:true}});
      originalQty=receivedQuantity-Number(previous._sum.quantity??0);
      unitCost=receivedQuantity?originals.reduce((s,x)=>s+Number(x.receivedQuantity)*Number(x.unitCost),0)/receivedQuantity:Number(originals[0].unitCost);
    }
    if(originalQty!==undefined&&item.quantity>originalQty+0.0001)throw new Error("Return quantity exceeds the unreturned quantity on the original document.");
    if(item.batchId){
      const batch=await tx.batch.findUnique({where:{id:item.batchId},select:{productId:true}});
      if(!batch||batch.productId!==item.productId)throw new Error("Selected batch does not match the product.");
    }
    const base=item.quantity*item.unitValue;
    lines.push({...item,unitCost,lineTotal:base+base*item.taxRate/100});
   }
   const subtotal=lines.reduce((s,x)=>s+x.quantity*x.unitValue,0);
   const grandTotal=lines.reduce((s,x)=>s+x.lineTotal,0);
   const taxTotal=grandTotal-subtotal;
   const record=await tx.returnDocument.create({data:{
    number:input.number,kind:input.kind,warehouseId:input.warehouseId,
    customerId:sourceSale?.customerId??undefined,supplierId:sourcePurchase?.supplierId??undefined,
    sourceSaleId:sourceSale?.id,sourcePurchaseId:sourcePurchase?.id,
    subtotal,taxTotal,grandTotal,notes:input.notes,createdBy:auth.userId,
    items:{create:lines.map(x=>({productId:x.productId,batchId:x.batchId,quantity:x.quantity,unitCost:x.unitCost,unitValue:x.unitValue,taxRate:x.taxRate,lineTotal:x.lineTotal}))}
   }});
   for(const line of lines){
    await changeStock(tx,{
     productId:line.productId,warehouseId:input.warehouseId,batchId:line.batchId,
     quantity:input.kind==="SALES_RETURN"?line.quantity:-line.quantity,
     type:input.kind,referenceType:"RETURN",referenceId:record.id,
     notes:input.number,actorId:auth.userId
    });
   }
   await tx.auditLog.create({data:{userId:auth.userId,action:input.kind,entity:"RETURN",entityId:record.id,after:{number:record.number,grandTotal,sourceSaleId:sourceSale?.id,sourcePurchaseId:sourcePurchase?.id}}});
   return record;
  },{isolationLevel:"Serializable"});
  return NextResponse.json({data},{status:201});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Invalid return document",details:e.issues},{status:400});return NextResponse.json({error:e instanceof Error?e.message:"Could not post return"},{status:400});}
}
