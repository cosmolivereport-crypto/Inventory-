import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const categories = ["Face Wash","Serum","Cream","Hair Care","Soap","Sunscreen","Moisturizer"];
  for (const name of categories) await prisma.category.upsert({where:{name},update:{},create:{name}});
  const unit = await prisma.unit.upsert({where:{symbol:"PCS"},update:{},create:{name:"Pieces",symbol:"PCS"}});
  const warehouse = await prisma.warehouse.upsert({where:{code:"MAIN"},update:{},create:{name:"Main Warehouse",code:"MAIN",address:"Cosmosentials"}});
  const sample = [
    {sku:"COS-HC-001",name:"Oceanbeauty Anti-dandruff Shampoo",category:"Hair Care",cost:185,mrp:349,qty:128,reorder:30,batch:"OB-2610",expiry:new Date("2027-10-30")},
    {sku:"COS-FW-002",name:"Gloinsta Face Wash",category:"Face Wash",cost:210,mrp:399,qty:18,reorder:25,batch:"GL-2608",expiry:new Date("2027-08-15")},
    {sku:"COS-AG-003",name:"Aleva Face Wash Gel",category:"Face Wash",cost:145,mrp:299,qty:0,reorder:20,batch:"AL-2607",expiry:new Date("2027-07-20")},
    {sku:"COS-TX-004",name:"Melano TX Ultra HQ 4% Serum",category:"Serum",cost:380,mrp:699,qty:64,reorder:15,batch:"MT-2609",expiry:new Date("2027-09-12")},
    {sku:"COS-TC-005",name:"Tretiva ACM 5-in-1 Cream 50ml",category:"Cream",cost:295,mrp:549,qty:42,reorder:12,batch:"TR-2611",expiry:new Date("2027-11-01")},
    {sku:"COS-SO-006",name:"Cosmosentials Haldi & Chandan Soap",category:"Soap",cost:28,mrp:79,qty:340,reorder:50,batch:"CS-2610",expiry:new Date("2028-03-01")},
    {sku:"COS-FW-007",name:"Acmed Face Wash Pack of 1",category:"Face Wash",cost:115,mrp:225,qty:2,reorder:15,batch:"AC-2610",expiry:new Date("2027-10-01")},
    {sku:"COS-MS-008",name:"Viso CX Serum",category:"Serum",cost:320,mrp:599,qty:9,reorder:12,batch:"VC-2606",expiry:new Date("2027-01-15")}
  ];
  for (const p of sample) {
    const category = await prisma.category.findUniqueOrThrow({where:{name:p.category}});
    const product = await prisma.product.upsert({where:{sku:p.sku},update:{},create:{sku:p.sku,name:p.name,categoryId:category.id,unitId:unit.id,costPrice:p.cost,sellingPrice:p.mrp,mrp:p.mrp,reorderLevel:p.reorder}});
    const batch = await prisma.batch.upsert({where:{productId_batchNumber:{productId:product.id,batchNumber:p.batch}},update:{},create:{productId:product.id,batchNumber:p.batch,expiryDate:p.expiry,costPrice:p.cost}});
    const balance = await prisma.stockBalance.findFirst({where:{productId:product.id,warehouseId:warehouse.id,batchId:batch.id}});
    if (!balance) {
      await prisma.stockBalance.create({data:{productId:product.id,warehouseId:warehouse.id,batchId:batch.id,quantity:p.qty}});
      if (p.qty) await prisma.stockMovement.create({data:{productId:product.id,warehouseId:warehouse.id,batchId:batch.id,type:"OPENING",quantity:p.qty,unitCost:p.cost,referenceType:"SEED",referenceId:"OPENING-STOCK",notes:"Initial demo opening balance"}});
    }
  }
}
main().finally(()=>prisma.$disconnect());
