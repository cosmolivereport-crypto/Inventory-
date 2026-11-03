import { MovementType, Prisma } from "@prisma/client";
type Tx = Prisma.TransactionClient;
const indiaDateKey=(value:Date)=>{const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value);const y=p.find(x=>x.type==="year")?.value??"0000",m=p.find(x=>x.type==="month")?.value??"00",d=p.find(x=>x.type==="day")?.value??"00";return y+"-"+m+"-"+d;};

export async function changeStock(tx:Tx,input:{
  productId:string; warehouseId:string; batchId?:string|null; quantity:number;
  type:MovementType; unitCost?:number; referenceType?:string; referenceId?:string; notes?:string; actorId?:string;
}) {
  if (!Number.isFinite(input.quantity) || input.quantity===0) throw new Error("Movement quantity must be a non-zero number");
  const batchId=input.batchId??null;
  const lockKey=input.productId+"|"+input.warehouseId+"|"+(batchId??"NO_BATCH");
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
  const current=await tx.stockBalance.findFirst({where:{productId:input.productId,warehouseId:input.warehouseId,batchId}});
  const next=Number(current?.quantity??0)+input.quantity;
  if(next<0) throw new Error("Insufficient stock for this SKU, warehouse and batch");
  if(current){
    const changed=await tx.stockBalance.updateMany({where:{id:current.id,quantity:current.quantity},data:{quantity:next}});
    if(changed.count!==1) throw new Error("Concurrent stock update detected. Retry the transaction.");
  }else{
    await tx.stockBalance.create({data:{productId:input.productId,warehouseId:input.warehouseId,batchId,quantity:next}});
  }
  const movement=await tx.stockMovement.create({data:{
    productId:input.productId,warehouseId:input.warehouseId,batchId,type:input.type,
    quantity:input.quantity,unitCost:input.unitCost,referenceType:input.referenceType,
    referenceId:input.referenceId,notes:input.notes,createdBy:input.actorId
  }});
  await tx.auditLog.create({data:{userId:input.actorId,action:input.type,entity:"STOCK_MOVEMENT",entityId:movement.id,after:{productId:input.productId,warehouseId:input.warehouseId,batchId,quantity:input.quantity,referenceType:input.referenceType,referenceId:input.referenceId}}});
  return movement;
}

export async function postSale(tx:Tx,input:{
  number:string; warehouseId:string; customerId?:string; actorId?:string;
  items:{productId:string;quantity:number;unitPrice:number;discount?:number;taxRate?:number;batchId?:string}[];
  notes?:string;
}) {
  if(!input.items.length) throw new Error("An invoice must contain at least one item");
  const productIds=[...new Set(input.items.map(x=>x.productId))];
  const products=await tx.product.findMany({where:{id:{in:productIds},active:true}});
  if(products.length!==productIds.length) throw new Error("One or more products are unavailable");
  const todayKey=indiaDateKey(new Date());
  const expanded:{productId:string;batchId:string|null;quantity:number;unitCost:number;unitPrice:number;discount:number;taxRate:number;lineTotal:number}[]=[];
  for(const item of input.items){
    const baseTotal=item.quantity*item.unitPrice-(item.discount??0);
    if(baseTotal<0) throw new Error("Discount cannot exceed line value");
    const allocations:{batchId:string|null;quantity:number}[]=[];
    if(item.batchId){
      const selected=await tx.batch.findUnique({where:{id:item.batchId},select:{productId:true,expiryDate:true,costPrice:true}});
      if(!selected||selected.productId!==item.productId)throw new Error("Selected batch does not belong to this SKU");
      if(selected.expiryDate&&indiaDateKey(selected.expiryDate)<todayKey)throw new Error("Expired batch cannot be sold");
      allocations.push({batchId:item.batchId,quantity:item.quantity});
    }else{
      const balances=await tx.stockBalance.findMany({where:{productId:item.productId,warehouseId:input.warehouseId,quantity:{gt:0}},include:{batch:true}});
      balances.sort((a,b)=>{
        const ax=a.batch?.expiryDate?.getTime()??Number.MAX_SAFE_INTEGER;
        const bx=b.batch?.expiryDate?.getTime()??Number.MAX_SAFE_INTEGER;
        return ax-bx;
      });
      let remaining=item.quantity;
      for(const balance of balances){
        if(balance.batch?.expiryDate&&indiaDateKey(balance.batch.expiryDate)<todayKey)continue;
        const available=Number(balance.quantity);
        const take=Math.min(available,remaining);
        if(take>0){allocations.push({batchId:balance.batchId,quantity:take});remaining-=take;}
        if(remaining<=0)break;
      }
      if(remaining>0)throw new Error("Insufficient unexpired stock for "+item.productId+" in the selected warehouse");
    }
    for(const allocation of allocations){
      const product=products.find(x=>x.id===item.productId)!;
      const batch=allocation.batchId?await tx.batch.findUnique({where:{id:allocation.batchId},select:{costPrice:true}}):null;
      const unitCost=Number(batch?.costPrice??product.costPrice);
      const ratio=allocation.quantity/item.quantity;
      const discount=(item.discount??0)*ratio;
      const base=allocation.quantity*item.unitPrice-discount;
      const taxRate=item.taxRate??0;
      expanded.push({productId:item.productId,batchId:allocation.batchId,quantity:allocation.quantity,unitCost,unitPrice:item.unitPrice,discount,taxRate,lineTotal:base+base*taxRate/100});
    }
  }
  const subtotal=expanded.reduce((s,l)=>s+l.quantity*l.unitPrice,0);
  const discount=expanded.reduce((s,l)=>s+l.discount,0);
  const taxTotal=expanded.reduce((s,l)=>s+l.lineTotal-(l.quantity*l.unitPrice-l.discount),0);
  const grandTotal=expanded.reduce((s,l)=>s+l.lineTotal,0);
  const sale=await tx.sale.create({data:{
    number:input.number,customerId:input.customerId,status:"APPROVED",paymentStatus:"UNPAID",
    subtotal,discount,taxTotal,grandTotal,notes:input.notes,
    items:{create:expanded.map(l=>({
      productId:l.productId,batchId:l.batchId??undefined,quantity:l.quantity,unitCost:l.unitCost,unitPrice:l.unitPrice,
      discount:l.discount,taxRate:l.taxRate,lineTotal:l.lineTotal
    }))}
  }});
  for(const line of expanded) await changeStock(tx,{
    productId:line.productId,warehouseId:input.warehouseId,batchId:line.batchId,
    quantity:-line.quantity,type:"SALE",unitCost:line.unitCost,referenceType:"SALE",referenceId:sale.id,notes:input.number,actorId:input.actorId
  });
  return sale;
}

export async function postPurchase(tx:Tx,input:{
  number:string; supplierId:string; warehouseId:string; actorId?:string;
  items:{productId:string;quantity:number;unitCost:number;discount?:number;taxRate?:number;batchNumber?:string;expiryDate?:string}[];
  notes?:string;
}) {
  if(!input.items.length) throw new Error("A purchase must contain at least one item");
  const lines=[];
  for(const item of input.items){
    const product=await tx.product.findUnique({where:{id:item.productId}});
    if(!product) throw new Error("Product not found");
    if(product.trackBatch&&!item.batchNumber)throw new Error("Batch number is required for "+product.name);
    if(product.trackExpiry&&!item.expiryDate)throw new Error("Expiry date is required for "+product.name);
    if(item.expiryDate&&indiaDateKey(new Date(item.expiryDate))<indiaDateKey(new Date()))throw new Error("Cannot receive an already expired batch");
    const base=item.quantity*item.unitCost-(item.discount??0);
    if(base<0) throw new Error("Discount cannot exceed line value");
    const lineTotal=base+base*(item.taxRate??0)/100;
    let batchId:string|undefined;
    if(item.batchNumber){
      const batch=await tx.batch.upsert({
        where:{productId_batchNumber:{productId:item.productId,batchNumber:item.batchNumber}},
        update:{expiryDate:item.expiryDate?new Date(item.expiryDate):undefined,costPrice:item.unitCost},
        create:{productId:item.productId,batchNumber:item.batchNumber,expiryDate:item.expiryDate?new Date(item.expiryDate):undefined,costPrice:item.unitCost}
      });
      batchId=batch.id;
    }
    lines.push({...item,lineTotal,batchId});
  }
  const subtotal=lines.reduce((s,l)=>s+l.quantity*l.unitCost,0);
  const discount=lines.reduce((s,l)=>s+(l.discount??0),0);
  const taxTotal=lines.reduce((s,l)=>s+l.lineTotal-(l.quantity*l.unitCost-(l.discount??0)),0);
  const grandTotal=lines.reduce((s,l)=>s+l.lineTotal,0);
  const purchase=await tx.purchase.create({data:{
    number:input.number,supplierId:input.supplierId,status:"RECEIVED",paymentStatus:"UNPAID",
    subtotal,discount,taxTotal,grandTotal,notes:input.notes,
    items:{create:lines.map(l=>({
      productId:l.productId,batchId:l.batchId,batchNumber:l.batchNumber,
      expiryDate:l.expiryDate?new Date(l.expiryDate):undefined,quantity:l.quantity,
      receivedQuantity:l.quantity,unitCost:l.unitCost,discount:l.discount??0,
      taxRate:l.taxRate??0,lineTotal:l.lineTotal
    }))}
  }});
  for(const line of lines) await changeStock(tx,{
    productId:line.productId,warehouseId:input.warehouseId,batchId:line.batchId,
    quantity:line.quantity,type:"PURCHASE",unitCost:line.unitCost,
    referenceType:"PURCHASE",referenceId:purchase.id,notes:input.number,actorId:input.actorId
  });
  return purchase;
}
