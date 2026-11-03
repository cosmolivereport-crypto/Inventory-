import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {changeStock} from "@/lib/inventory";
const schema=z.object({number:z.string().min(1),fromWarehouseId:z.string(),toWarehouseId:z.string(),notes:z.string().optional(),items:z.array(z.object({productId:z.string(),batchId:z.string().optional(),quantity:z.number().positive()})).min(1)});
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY"]);if(denied(auth))return auth;
 try{const input=schema.parse(await req.json());if(input.fromWarehouseId===input.toWarehouseId)throw new Error("Source and destination warehouses must be different");const result=await prisma.$transaction(async tx=>{const transfer=await tx.stockTransfer.create({data:{number:input.number,fromWarehouseId:input.fromWarehouseId,toWarehouseId:input.toWarehouseId,notes:input.notes,status:"APPROVED",items:{create:input.items}}});for(const i of input.items){await changeStock(tx,{...i,warehouseId:input.fromWarehouseId,quantity:-i.quantity,type:"TRANSFER_OUT",referenceType:"STOCK_TRANSFER",referenceId:transfer.id,notes:input.number,actorId:auth.userId});await changeStock(tx,{...i,warehouseId:input.toWarehouseId,quantity:i.quantity,type:"TRANSFER_IN",referenceType:"STOCK_TRANSFER",referenceId:transfer.id,notes:input.number,actorId:auth.userId});}return transfer;},{isolationLevel:"Serializable"});return NextResponse.json({data:result},{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid transfer"},{status:400});}}
