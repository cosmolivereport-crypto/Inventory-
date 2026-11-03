import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {compare} from "bcryptjs";
import {prisma} from "@/lib/prisma";
import {SESSION_COOKIE,signSession} from "@/lib/auth";
const schema=z.object({email:z.string().email(),password:z.string().min(1).max(200)});
export async function POST(req:NextRequest){
 try{
  const data=schema.parse(await req.json());
  const user=await prisma.user.findUnique({where:{email:data.email.toLowerCase()},select:{id:true,email:true,name:true,role:true,passwordHash:true,active:true}});
  if(!user||!user.active||!(await compare(data.password,user.passwordHash)))return NextResponse.json({error:"Email or password is incorrect."},{status:401});
  const token=await signSession({userId:user.id,email:user.email,role:user.role});
  const res=NextResponse.json({user:{id:user.id,email:user.email,name:user.name,role:user.role}});
  res.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:43200});
  return res;
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Enter a valid email and password."},{status:400});return NextResponse.json({error:"Sign in is unavailable. Check server configuration."},{status:503});}
}
