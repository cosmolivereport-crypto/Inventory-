import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export async function GET(){const [categories,brands,units,warehouses,suppliers,customers]=await Promise.all([prisma.category.findMany({orderBy:{name:"asc"}}),prisma.brand.findMany({orderBy:{name:"asc"}}),prisma.unit.findMany({orderBy:{name:"asc"}}),prisma.warehouse.findMany({where:{active:true}}),prisma.supplier.findMany({orderBy:{name:"asc"}}),prisma.customer.findMany({orderBy:{name:"asc"}})]);return NextResponse.json({categories,brands,units,warehouses,suppliers,customers});}
