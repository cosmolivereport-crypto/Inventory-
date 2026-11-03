import {NextRequest,NextResponse} from "next/server";
import {readSession} from "@/lib/auth";
export async function GET(req:NextRequest){const token=req.cookies.get("cosmo_session")?.value;if(!token)return NextResponse.json({user:null},{status:401});const user=await readSession(token);if(!user)return NextResponse.json({user:null},{status:401});return NextResponse.json({user});}
