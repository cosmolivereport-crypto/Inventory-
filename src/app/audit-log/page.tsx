"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,RefreshCw} from "lucide-react";
type Entry={id:string;action:string;entity:string;entityId:string|null;createdAt:string;user?:{name:string;email:string;role:string}|null;before:any;after:any};
export default function AuditLogPage(){
 const router=useRouter();const [rows,setRows]=useState<Entry[]>([]),[error,setError]=useState("");
 async function load(){const r=await fetch("/api/audit-log?limit=200");const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load activity log");setRows(d.data||[]);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">ADMINISTRATION / SECURITY</div><h1>Activity log</h1><p>Review recorded admin and stock-system events.</p></div><div className="heading-actions"><button className="btn btn-light" onClick={()=>router.push("/")}><ArrowLeft size={14}/> Dashboard</button><button className="btn btn-light" onClick={()=>load()}><RefreshCw size={14}/> Refresh</button></div></div>{error&&<div className="notice error-notice">{error}</div>}<section className="panel table-panel"><div className="panel-header"><div><h3>Audit events</h3><p>{rows.length} most recent events</p></div></div><div className="table-wrap"><table><thead><tr><th>TIME</th><th>USER</th><th>ACTION</th><th>ENTITY</th><th>RECORD</th><th>DETAILS</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.createdAt).toLocaleString("en-IN")}</td><td>{x.user?.name||"System"}</td><td><b>{x.action}</b></td><td>{x.entity}</td><td>{x.entityId||"—"}</td><td>{JSON.stringify(x.after||{})}</td></tr>)}</tbody></table>{!rows.length&&<div className="empty-state">No audit events recorded yet.</div>}</div></section></main>;
}
