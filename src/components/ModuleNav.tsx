"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useState} from "react";
import {Boxes,ChevronDown,Home,LogOut,Package,ShoppingBag,ShoppingCart,BarChart3,Settings,Menu,X} from "lucide-react";
const links=[["Dashboard","/",Home],["Products","/products",Package],["Stock","/stock",Boxes],["Purchases","/purchases",ShoppingCart],["Sales","/sales",ShoppingBag],["Reports","/reports",BarChart3],["Masters","/masters",Settings]] as const;
export default function ModuleNav(){
 const path=usePathname(),router=useRouter();const [open,setOpen]=useState(false);
 if(path==="/"||path==="/login")return null;
 async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login");router.refresh();}
 return <header className="module-nav"><Link className="module-brand" href="/"><span className="brand-mark">C</span><b>cosmo<span>inventory</span></b></Link><button className="module-menu-btn" onClick={()=>setOpen(!open)}>{open?<X size={18}/>:<Menu size={18}/>} Menu</button><nav className={open?"module-links module-links-open":"module-links"}>{links.map(([label,url,Icon])=><Link key={url} href={url} className={path===url?"module-link active":"module-link"} onClick={()=>setOpen(false)}><Icon size={14}/>{label}</Link>)}</nav><button className="module-logout" onClick={logout}><LogOut size={14}/> Sign out</button></header>;
}
