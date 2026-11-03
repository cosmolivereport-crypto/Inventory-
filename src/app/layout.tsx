import type { Metadata } from "next";
import "./globals.css";
import ModuleNav from "@/components/ModuleNav";
export const metadata: Metadata = { title: "Cosmo Inventory | Stock Management", description: "Inventory, purchasing, sales and stock control for Cosmosentials." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><ModuleNav/>{children}</body></html>; }
