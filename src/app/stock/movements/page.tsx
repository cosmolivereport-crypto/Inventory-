"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,RefreshCw} from "lucide-react";
export default function MovementsPage(){
 const router=useRouter();const [rows,setRows]=useState<any[]>([]);const [error,setError]=useState("");
 async function load(){const r=await fetch("/api/stock/movements");const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load ledger");setRows(d.data||[]);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">INVENTORY / AUDIT TRAIL</div><h1>Stock movements</h1><p>Immutable record of purchases, sales, returns, transfers and adjustments.</p></div><div className="heading-actions"><button className="btn btn-light" onClick={()=>router.push("/")}><ArrowLeft size={15}/> Dashboard</button><button className="btn btn-light" onClick={()=>load()}><RefreshCw size={14}/> Refresh</button></div></div>{error&&<div className="notice">{error}</div>}<section className="panel table-panel"><div className="panel-header"><div><h3>Stock ledger</h3><p>{rows.length} latest records</p></div></div><div className="table-wrap"><table><thead><tr><th>DATE</th><th>REFERENCE</th><th>SKU / PRODUCT</th><th>WAREHOUSE</th><th>BATCH</th><th>TYPE</th><th>QUANTITY</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.createdAt).toLocaleString("en-IN")}</td><td>{x.referenceId||"—"}</td><td><b>{x.product?.sku}</b><small className="sub-cell">{x.product?.name}</small></td><td>{x.warehouse?.name}</td><td>{x.batch?.batchNumber||"—"}</td><td>{x.type}</td><td className={Number(x.quantity)>0?"positive":"negative"}>{Number(x.quantity)>0?"+":""}{x.quantity}</td></tr>)}</tbody></table></div></section></main>;
}
