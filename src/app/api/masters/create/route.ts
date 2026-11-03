import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","MANAGER"]);if(denied(auth))return auth;
 try{
  const x=await req.json();
  if(typeof x.name!=="string"||!x.name.trim())return NextResponse.json({error:"Name is required"},{status:400});
  let data;
  if(x.type==="category")data=await prisma.category.create({data:{name:x.name.trim(),description:x.description||undefined}});
  else if(x.type==="brand")data=await prisma.brand.create({data:{name:x.name.trim()}});
  else if(x.type==="unit"){if(!x.symbol)return NextResponse.json({error:"Unit symbol is required"},{status:400});data=await prisma.unit.create({data:{name:x.name.trim(),symbol:String(x.symbol).toUpperCase()}});}
  else if(x.type==="warehouse"){if(!x.code)return NextResponse.json({error:"Warehouse code is required"},{status:400});data=await prisma.warehouse.create({data:{name:x.name.trim(),code:String(x.code).toUpperCase(),address:x.address||undefined}});}
  else if(x.type==="supplier")data=await prisma.supplier.create({data:{name:x.name.trim(),code:x.code||undefined,gstin:x.gstin||undefined,phone:x.phone||undefined,email:x.email||undefined,address:x.address||undefined}});
  else if(x.type==="customer")data=await prisma.customer.create({data:{name:x.name.trim(),phone:x.phone||undefined,email:x.email||undefined,gstin:x.gstin||undefined,billingAddress:x.address||undefined}});
  else return NextResponse.json({error:"Unknown master type"},{status:400});
  await prisma.auditLog.create({data:{userId:auth.userId,action:"MASTER_CREATED",entity:"MASTER",entityId:data.id,after:{type:x.type,name:x.name}}});
  return NextResponse.json({data},{status:201});
 }catch{return NextResponse.json({error:"Could not create record; check duplicate name, code or email."},{status:409});}
}
