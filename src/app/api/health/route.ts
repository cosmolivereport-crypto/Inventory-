import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({status:"ok",service:"cosmo-inventory",databaseConfigured:Boolean(process.env.DATABASE_URL),timestamp:new Date().toISOString()});
}
