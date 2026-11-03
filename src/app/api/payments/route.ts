import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
const schema=z.object({
 direction:z.enum(["IN","OUT"]),partyType:z.enum(["CUSTOMER","SUPPLIER"]),partyId:z.string().optional(),
 amount:z.number().positive(),method:z.enum(["CASH","UPI","CARD","BANK_TRANSFER","CHEQUE","OTHER"]),
 transactionDate:z.string().optional(),referenceNumber:z.string().optional(),
 referenceType:z.enum(["SALE","PURCHASE"]).optional(),referenceId:z.string().optional(),notes:z.string().optional()
}).superRefine((v,ctx)=>{
 if((v.referenceType==="SALE"||v.referenceType==="PURCHASE")&&!v.referenceId)ctx.addIssue({code:"custom",message:"Select the invoice or bill to allocate this payment.",path:["referenceId"]});
 if(v.referenceType==="SALE"&&(v.direction!=="IN"||v.partyType!=="CUSTOMER"))ctx.addIssue({code:"custom",message:"Sale invoices require a customer receipt.",path:["direction"]});
 if(v.referenceType==="PURCHASE"&&(v.direction!=="OUT"||v.partyType!=="SUPPLIER"))ctx.addIssue({code:"custom",message:"Purchase bills require a supplier payment.",path:["direction"]});
});
export async function GET(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","ACCOUNTANT"]);if(denied(auth))return auth;try{const data=await prisma.payment.findMany({orderBy:{transactionDate:"desc"},take:200});return NextResponse.json({data});}catch{return NextResponse.json({error:"Could not load payments"},{status:503});}}
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","ACCOUNTANT"]);if(denied(auth))return auth;
 try{
  const i=schema.parse(await req.json());
  const data=await prisma.$transaction(async tx=>{
   let partyId=i.partyId;
   if(i.referenceType==="SALE"&&i.referenceId){
    const sale=await tx.sale.findUniqueOrThrow({where:{id:i.referenceId}});
    if(i.partyId&&sale.customerId!==i.partyId)throw new Error("Receipt customer does not match the selected invoice.");
    partyId=sale.customerId??undefined;
    const paid=Number(sale.paidAmount)+i.amount;
    if(paid>Number(sale.grandTotal)+0.001)throw new Error("Receipt exceeds outstanding invoice balance.");
    await tx.sale.update({where:{id:sale.id},data:{paidAmount:paid,paymentStatus:paid+0.001>=Number(sale.grandTotal)?"PAID":"PARTIAL"}});
   }
   if(i.referenceType==="PURCHASE"&&i.referenceId){
    const purchase=await tx.purchase.findUniqueOrThrow({where:{id:i.referenceId}});
    if(i.partyId&&purchase.supplierId!==i.partyId)throw new Error("Payment supplier does not match the selected bill.");
    partyId=purchase.supplierId;
    const paid=Number(purchase.paidAmount)+i.amount;
    if(paid>Number(purchase.grandTotal)+0.001)throw new Error("Payment exceeds outstanding bill balance.");
    await tx.purchase.update({where:{id:purchase.id},data:{paidAmount:paid,paymentStatus:paid+0.001>=Number(purchase.grandTotal)?"PAID":"PARTIAL"}});
   }
   const payment=await tx.payment.create({data:{direction:i.direction,partyType:i.partyType,partyId,amount:i.amount,method:i.method,transactionDate:i.transactionDate?new Date(i.transactionDate):new Date(),referenceNumber:i.referenceNumber,referenceType:i.referenceType,referenceId:i.referenceId,notes:i.notes}});
   await tx.auditLog.create({data:{userId:auth.userId,action:"PAYMENT_RECORDED",entity:"PAYMENT",entityId:payment.id,after:{direction:i.direction,partyType:i.partyType,partyId,amount:i.amount,method:i.method,referenceType:i.referenceType,referenceId:i.referenceId}}});
   return payment;
  },{isolationLevel:"Serializable"});
  return NextResponse.json({data},{status:201});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Invalid payment details",details:e.issues},{status:400});return NextResponse.json({error:e instanceof Error?e.message:"Could not record payment"},{status:400});}
}
