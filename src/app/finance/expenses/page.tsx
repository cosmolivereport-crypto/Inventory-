"use client";
import {useEffect,useState} from "react";
export default function Page(){
const [rows,S]=useState<any[]>([]),[cat,C]=useState("Office"),[desc,D]=useState(""),[amount,A]=useState("0"),[method,M]=useState("UPI"),[msg,G]=useState("");
async function load(){const r=await fetch("/api/expenses");const d=await r.json();S(d.data||[]);}
useEffect(()=>{load().catch(()=>G("Cannot load expenses"));},[]);
async function save(e:any){e.preventDefault();const r=await fetch("/api/expenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({number:"EXP-"+Date.now(),category:cat,description:desc,amount:Number(amount),paymentMethod:method})});const d=await r.json();G(r.ok?"Expense saved":d.error||"Save failed");if(r.ok){D("");A("0");load();}}
return <main className="page-content"><h1>Expenses</h1><p>Record business expenses.</p>{msg&&<div className="notice">{msg}</div>}<section className="panel"><form className="form-grid" onSubmit={save}><label>Category<input value={cat} onChange={e=>C(e.target.value)}/></label><label>Description<input value={desc} onChange={e=>D(e.target.value)}/></label><label>Amount ₹<input type="number" min=".01" step=".01" value={amount} onChange={e=>A(e.target.value)}/></label><label>Method<select value={method} onChange={e=>M(e.target.value)}>{["CASH","UPI","CARD","BANK_TRANSFER","CHEQUE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label><button className="btn btn-primary">Save expense</button></form></section><section className="panel" style={{marginTop:14}}><h3>Recent expenses</h3>{rows.map(x=><p key={x.id}>{x.category} · ₹{Number(x.amount).toFixed(2)} · {new Date(x.date).toLocaleDateString("en-IN")}</p>)}</section></main>;
}
