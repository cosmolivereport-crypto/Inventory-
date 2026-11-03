import {requireRole,denied} from "@/lib/authorization";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
const schema=z.object({number:z.string().min(1),category:z.string().min(1),description:z.string().optional(),amount:z.number().positive(),date:z.string().optional(),paymentMethod:z.string().optional()});
export async function GET(){const data=await prisma.expense.findMany({orderBy:{date:"desc"},take:200});return NextResponse.json({data});}
export async function POST(req:NextRequest){
 const auth=await requireRole(req,["OWNER","ADMIN","ACCOUNTANT"]);if(denied(auth))return auth;
 try{const i=schema.parse(await req.json());const data=await prisma.expense.create({data:{...i,date:i.date?new Date(i.date):new Date()}});return NextResponse.json({data},{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid expense"},{status:400});}}
