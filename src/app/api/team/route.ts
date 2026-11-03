import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {hash} from "bcryptjs";
import {prisma} from "@/lib/prisma";
import {requireRole,denied} from "@/lib/authorization";
const createSchema=z.object({name:z.string().trim().min(2).max(100),email:z.string().email().transform(v=>v.toLowerCase()),password:z.string().min(14).max(200),role:z.enum(["ADMIN","MANAGER","INVENTORY","STAFF","ACCOUNTANT"])});
export async function GET(req:NextRequest){
 const auth=await requireRole(req,["OWNER"]);if(denied(auth))return auth;
 const users=await prisma.user.findMany({select:{id:true,name:true,email:true,role:true,active:true,createdAt:true,updatedAt:true},orderBy:{createdAt:"asc"}});
 return NextResponse.json({data:users});
}
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER"]);if(denied(auth))return auth;
 try{
  const input=createSchema.parse(await req.json()),passwordHash=await hash(input.password,12);
  const user=await prisma.$transaction(async tx=>{
   const created=await tx.user.create({data:{name:input.name,email:input.email,passwordHash,role:input.role}});
   await tx.auditLog.create({data:{userId:auth.userId,action:"USER_CREATED",entity:"USER",entityId:created.id,after:{email:created.email,role:created.role}}});
   return created;
  });
  return NextResponse.json({data:{id:user.id,name:user.name,email:user.email,role:user.role,active:user.active}},{status:201});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Check name, email, role and 14+ character password."},{status:400});return NextResponse.json({error:"Could not create team member. Email may already exist."},{status:409});}
}
export async function PATCH(req:NextRequest){
 const auth=await requireRole(req,["OWNER"]);if(denied(auth))return auth;
 try{
  const input=z.object({userId:z.string(),active:z.boolean().optional(),role:z.enum(["ADMIN","MANAGER","INVENTORY","STAFF","ACCOUNTANT","OWNER"]).optional(),password:z.string().min(14).max(200).optional()}).refine(x=>x.active!==undefined||x.role!==undefined||x.password!==undefined).parse(await req.json());
  const existing=await prisma.user.findUnique({where:{id:input.userId}});
  if(!existing)return NextResponse.json({error:"Team member not found"},{status:404});
  const removesOwner=existing.role==="OWNER"&&(input.role!==undefined&&input.role!=="OWNER"||input.active===false);
  if(removesOwner){const owners=await prisma.user.count({where:{role:"OWNER",active:true}});if(owners<=1)return NextResponse.json({error:"At least one active owner must remain."},{status:400});}
  const update:any={};if(input.active!==undefined)update.active=input.active;if(input.role)update.role=input.role;if(input.password)update.passwordHash=await hash(input.password,12);
  const user=await prisma.$transaction(async tx=>{const u=await tx.user.update({where:{id:existing.id},data:update});await tx.auditLog.create({data:{userId:auth.userId,action:"USER_UPDATED",entity:"USER",entityId:u.id,before:{role:existing.role,active:existing.active},after:{role:u.role,active:u.active}}});return u;});
  return NextResponse.json({data:{id:user.id,name:user.name,email:user.email,role:user.role,active:user.active}});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Invalid team member update."},{status:400});return NextResponse.json({error:"Could not update team member."},{status:409});}
}
