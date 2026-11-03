import { MovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
type Tx = Prisma.TransactionClient;
export async function changeStock(tx:Tx,input:{productId:string;warehouseId:string;batchId?:string|null;quantity:number;type:MovementType;unitCost?:number;referenceType?:string;referenceId?:string;notes?:string}) {
  if (!Number.isFinite(input.quantity) || input.quantity===0) throw new Error("Movement quantity must be a non-zero number");
  const batchId=input.batchId??null;
  const key={productId_warehouseId_batchId:{productId:input.productId,warehouseId:input.warehouseId,batchId}};
  const current=await tx.stockBalance.findUnique({where:key});
  const next=Number(current?.quantity??0)+input.quantity;
  if(next < 0) throw new Error("Insufficient stock for this SKU, warehouse and batch");
  if(current) await tx.stockBalance.update({where:{id:current.id},data:{quantity:next}});
  else await tx.stockBalance.create({data:{productId:input.productId,warehouseId:input.warehouseId,batchId,quantity:next}});
  return tx.stockMovement.create({data:{productId:input.productId,warehouseId:input.warehouseId,batchId,type:input.type,quantity:input.quantity,unitCost:input.unitCost,referenceType:input.referenceType,referenceId:input.referenceId,notes:input.notes}});
}
export async function postSale(tx:Tx,input:{number:string;warehouseId:string;customerId?:string;items:{productId:string;quantity:number;unitPrice:number;discount?:number;taxRate?:number;batchId?:string}[];notes?:string}) {
  if(input.items.length===0) throw new Error("An invoice must contain at least one item");
  const productIds=[...new Set(input.items.map(x=>x.productId))];
  const products=await tx.product.findMany({where:{id:{in:productIds},active:true}});
  if(products.length!==productIds.length) throw new Error("One or more products are unavailable");
  const lines=input.items.map(i=>{const base=i.quantity*i.unitPrice-(i.discount??0);const tax=base*(i.taxRate??0)/100;return {...i,lineTotal:base+tax}});
  const subtotal=lines.reduce((s,l)=>s+l.quantity*l.unitPrice,0);
  const discount=lines.reduce((s,l)=>s+(l.discount??0),0);
  const taxTotal=lines.reduce((s,l)=>s+(l.lineTotal-(l.quantity*l.unitPrice-(l.discount??0)),0);
  const grandTotal=lines.reduce((s,l)=>s+l.lineTotal,0);
  const sale=await tx.sale.create({data:{number:input.number,customerId:input.customerId,status:"APPROVED",paymentStatus:"UNPAID",subtotal,discount,taxTotal,grandTotal,notes:input.notes,items:{create:lines.map(l=>({productId:l.productId,batchId:l.batchId,quantity:l.quantity,unitPrice:l.unitPrice,discount:l.discount??0,taxRate:l.taxRate??0,lineTotal:l.lineTotal}))}}});
  for(const line of lines) await changeStock(tx,{productId:line.productId,warehouseId:input.warehouseId,batchId:line.batchId,quantity:-line.quantity,type:"SALE",referenceType:"SALE",referenceId:sale.id,notes:input.number});
  return sale;
}
export async function postPurchase(tx:Tx,input:{number:string;supplierId:string;warehouseId:string;items:{productId:string;quantity:number;unitCost:number;discount?:number;taxRate?:number;batchNumber?:string;expiryDate?:string}[];notes?:string}) {
  if(input.items.length===0) throw new Error("A purchase must contain at least one item");
  const lines=[];
  for(const item of input.items){
    const product=await tx.product.findUnique({where:{id:item.productId}});
    if(!product) throw new Error("Product not found");
    const base=item.quantity*item.unitCost-(item.discount??0);
    const lineTotal=base+base*(item.taxRate??0)/100;
    let batchId:string|undefined;
    if(item.batchNumber){
      const batch=await tx.batch.upsert({where:{productId_batchNumber:{productId:item.productId,batchNumber:item.batchNumber}},update:{expiryDate:item.expiryDate?new Date(item.expiryDate):undefined,costPrice:item.unitCost},create:{productId:item.productId,batchNumber:item.batchNumber,expiryDate:item.expiryDate?new Date(item.expiryDate):undefined,costPrice:item.unitCost}});
      batchId=batch.id;
    }
    lines.push({...item,lineTotal,batchId});
  }
  const subtotal=lines.reduce((s,l)=>s+l.quantity*l.unitCost,0),discount=lines.reduce((s,l)=>s+(l.discount??0),0),taxTotal=lines.reduce((s,l)=>s+l.lineTotal-(l.quantity*l.unitCost-(l.discount??0)),0),grandTotal=lines.reduce((s,l)=>s+l.lineTotal,0);
  const purchase=await tx.purchase.create({data:{number:input.number,supplierId:input.supplierId,status:"RECEIVED",paymentStatus:"UNPAID",subtotal,discount,taxTotal,grandTotal,notes:input.notes,items:{create:lines.map(l=>({productId:l.productId,batchNumber:l.batchNumber,expiryDate:l.expiryDate?new Date(l.expiryDate):undefined,quantity:l.quantity,receivedQuantity:l.quantity,unitCost:l.unitCost,discount:l.discount??0,taxRate:l.taxRate??0,lineTotal:l.lineTotal}))}}});
  for(const line of lines) await changeStock(tx,{productId:line.productId,warehouseId:input.warehouseId,batchId:line.batchId,quantity:line.quantity,type:"PURCHASE",unitCost:line.unitCost,referenceType:"PURCHASE",referenceId:purchase.id,notes:input.number});
  return purchase;
}
