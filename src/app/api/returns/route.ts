import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {changeStock} from "@/lib/inventory";
const schema=z.object({kind:z.enum(["SALES_RETURN","PURCHASE_RETURN"]),number:z.string().min(1),warehouseId:z.string(),partyId:z.string().optional(),notes:z.string().optional(),items:z.array(z.object({productId:z.string(),batchId:z.string().optional(),quantity:z.number().positive(),unitValue:z.number().nonnegative()})).min(1)});
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY","STAFF"]);if(denied(auth))return auth;
 try{const input=schema.parse(await req.json());const data=await prisma.$transaction(async tx=>{const total=input.items.reduce((s,i)=>s+i.quantity*i.unitValue,0);const record=await tx.payment.create({data:{direction:input.kind==="SALES_RETURN"?"OUT":"IN",partyType:input.kind==="SALES_RETURN"?"CUSTOMER":"SUPPLIER",partyId:input.partyId,referenceType:input.kind,referenceId:input.number,amount:total,method:"CREDIT_NOTE",referenceNumber:input.number,notes:input.notes}});for(const i of input.items){await changeStock(tx,{productId:i.productId,warehouseId:input.warehouseId,batchId:i.batchId,quantity:input.kind==="SALES_RETURN"?i.quantity:-i.quantity,type:input.kind,referenceType:input.kind,referenceId:record.id,notes:input.notes});}return record;},{isolationLevel:"Serializable"});return NextResponse.json({data},{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid return"},{status:400});}}
