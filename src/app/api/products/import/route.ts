import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {changeStock} from "@/lib/inventory";
import {requireRole,denied} from "@/lib/authorization";
const rowSchema=z.object({
 sku:z.string().trim().min(1).max(80),name:z.string().trim().min(1).max(200),
 barcode:z.string().trim().optional(),category:z.string().trim().optional(),brand:z.string().trim().optional(),unit:z.string().trim().optional(),
 hsnCode:z.string().trim().optional(),gstRate:z.number().min(0).max(100).default(0),
 costPrice:z.number().min(0).default(0),sellingPrice:z.number().min(0).default(0),mrp:z.number().min(0).default(0),
 reorderLevel:z.number().min(0).default(0),openingStock:z.number().min(0).default(0),
 warehouseCode:z.string().trim().optional(),batchNumber:z.string().trim().optional(),expiryDate:z.string().optional(),
 trackBatch:z.boolean().default(true),trackExpiry:z.boolean().default(true)
});
const payloadSchema=z.object({rows:z.array(rowSchema).min(1).max(1000)});
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY"]);if(denied(auth))return auth;
 try{
  const input=payloadSchema.parse(await req.json());
  const seen=new Set<string>();
  for(let i=0;i<input.rows.length;i++){const key=input.rows[i].sku.toUpperCase();if(seen.has(key))throw new Error("Duplicate SKU in import file at row "+(i+2)+": "+key);seen.add(key);}
  const result=await prisma.$transaction(async tx=>{
   const created=[];
   for(let i=0;i<input.rows.length;i++){
    const row=input.rows[i],line=i+2;
    if(await tx.product.findUnique({where:{sku:row.sku}}))throw new Error("SKU already exists at CSV row "+line+": "+row.sku);
    const [category,brand,unit,warehouse]=await Promise.all([
     row.category?tx.category.findUnique({where:{name:row.category}}):Promise.resolve(null),
     row.brand?tx.brand.findUnique({where:{name:row.brand}}):Promise.resolve(null),
     row.unit?tx.unit.findUnique({where:{symbol:row.unit.toUpperCase()}}):Promise.resolve(null),
     row.warehouseCode?tx.warehouse.findUnique({where:{code:row.warehouseCode.toUpperCase()}}):Promise.resolve(null)
    ]);
    if(row.category&&!category)throw new Error("Unknown category at CSV row "+line+": "+row.category);
    if(row.brand&&!brand)throw new Error("Unknown brand at CSV row "+line+": "+row.brand);
    if(row.unit&&!unit)throw new Error("Unknown unit at CSV row "+line+": "+row.unit);
    if(row.warehouseCode&&!warehouse)throw new Error("Unknown warehouse code at CSV row "+line+": "+row.warehouseCode);
    if(row.openingStock>0&&!warehouse)throw new Error("Warehouse code is required for opening stock at CSV row "+line);
    if(row.trackBatch&&!row.batchNumber&&row.openingStock>0)throw new Error("Batch number is required at CSV row "+line);
    if(row.trackExpiry&&!row.expiryDate&&row.openingStock>0)throw new Error("Expiry date is required at CSV row "+line);
    const product=await tx.product.create({data:{
     sku:row.sku,name:row.name,barcode:row.barcode||undefined,categoryId:category?.id,brandId:brand?.id,unitId:unit?.id,
     hsnCode:row.hsnCode||undefined,gstRate:row.gstRate,costPrice:row.costPrice,sellingPrice:row.sellingPrice,mrp:row.mrp,
     reorderLevel:row.reorderLevel,trackBatch:row.trackBatch,trackExpiry:row.trackExpiry
    }});
    let batchId:string|undefined;
    if(row.openingStock>0){
     if(row.batchNumber){const batch=await tx.batch.create({data:{productId:product.id,batchNumber:row.batchNumber,expiryDate:row.expiryDate?new Date(row.expiryDate):undefined,costPrice:row.costPrice}});batchId=batch.id;}
     await changeStock(tx,{productId:product.id,warehouseId:warehouse!.id,batchId,quantity:row.openingStock,type:"OPENING",unitCost:row.costPrice,referenceType:"PRODUCT_IMPORT",referenceId:product.id,notes:"Opening stock from CSV import",actorId:auth.userId});
    }
    created.push(product);
   }
   await tx.auditLog.create({data:{userId:auth.userId,action:"PRODUCTS_IMPORTED",entity:"PRODUCT_IMPORT",after:{count:created.length,skus:created.map(x=>x.sku)}}});
   return {count:created.length,products:created.map(x=>({id:x.id,sku:x.sku,name:x.name}))};
  },{isolationLevel:"Serializable"});
  return NextResponse.json({data:result},{status:201});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Invalid import data",details:e.issues},{status:400});return NextResponse.json({error:e instanceof Error?e.message:"Product import failed"},{status:400});}
}
