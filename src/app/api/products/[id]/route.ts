import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {requireRole,denied} from "@/lib/authorization";
const schema=z.object({
 name:z.string().trim().min(1).max(200).optional(),
 barcode:z.string().trim().nullable().optional(),
 description:z.string().optional(),
 categoryId:z.string().nullable().optional(),brandId:z.string().nullable().optional(),unitId:z.string().nullable().optional(),
 hsnCode:z.string().trim().nullable().optional(),gstRate:z.number().min(0).max(100).optional(),
 costPrice:z.number().min(0).optional(),sellingPrice:z.number().min(0).optional(),mrp:z.number().min(0).optional(),
 reorderLevel:z.number().min(0).optional(),trackBatch:z.boolean().optional(),trackExpiry:z.boolean().optional(),active:z.boolean().optional()
}).refine(x=>Object.keys(x).length>0);
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;const product=await prisma.product.findUnique({where:{id},include:{category:true,brand:true,unit:true,batches:true,stockBalances:{include:{warehouse:true,batch:true}},movements:{include:{warehouse:true,batch:true},orderBy:{createdAt:"desc"},take:100}}});if(!product)return NextResponse.json({error:"Product not found"},{status:404});return NextResponse.json({data:product});}
 catch{return NextResponse.json({error:"Could not load product"},{status:503});}
}
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER","INVENTORY"]);if(denied(auth))return auth;
 try{
  const {id}=await params,input=schema.parse(await req.json());
  const existing=await prisma.product.findUnique({where:{id},include:{stockBalances:true}});
  if(!existing)return NextResponse.json({error:"Product not found"},{status:404});
  if(input.active===false&&existing.stockBalances.reduce((s,b)=>s+Number(b.quantity),0)>0)return NextResponse.json({error:"Cannot archive a product while stock remains. Transfer, sell or adjust stock to zero first."},{status:400});
  if(input.trackExpiry===true&&input.trackBatch===false)return NextResponse.json({error:"Expiry tracking requires batch tracking."},{status:400});
  if(input.barcode!==undefined&&input.barcode!==null&&input.barcode.trim()==="")input.barcode=null;
  const data=await prisma.$transaction(async tx=>{
   const product=await tx.product.update({where:{id},data:input});
   await tx.auditLog.create({data:{userId:auth.userId,action:input.active===false?"PRODUCT_ARCHIVED":"PRODUCT_UPDATED",entity:"PRODUCT",entityId:id,before:{name:existing.name,mrp:Number(existing.mrp),costPrice:Number(existing.costPrice),active:existing.active},after:{name:product.name,mrp:Number(product.mrp),costPrice:Number(product.costPrice),active:product.active}}});
   return product;
  });
  return NextResponse.json({data});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Invalid product details",details:e.issues},{status:400});return NextResponse.json({error:"Could not update product. Check duplicate barcode or master selection."},{status:409});}
}
