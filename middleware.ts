import {NextRequest,NextResponse} from "next/server";
import {jwtVerify} from "jose";
export async function middleware(req:NextRequest){
 const path=req.nextUrl.pathname;
 const open=path==="/login"||path==="/api/auth/login"||path==="/api/health";
 const token=req.cookies.get("cosmo_session")?.value;
 if(!token){if(open)return NextResponse.next();if(path.startsWith("/api/"))return NextResponse.json({error:"Authentication required"},{status:401});return NextResponse.redirect(new URL("/login",req.url));}
 try{
  const secret=process.env.AUTH_SECRET;
  if(!secret||secret.length<32)throw new Error("Set AUTH_SECRET");
  const {payload}=await jwtVerify(token,new TextEncoder().encode(secret));
  if(!payload.userId||!payload.role)throw new Error("Invalid session");
  if(path==="/login")return NextResponse.redirect(new URL("/",req.url));
  return NextResponse.next();
 }catch{
  const response=path.startsWith("/api/")?NextResponse.json({error:"Session expired. Please sign in again."},{status:401}):NextResponse.redirect(new URL("/login",req.url));
  response.cookies.delete("cosmo_session");return response;
 }
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
