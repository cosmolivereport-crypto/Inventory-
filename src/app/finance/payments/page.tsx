"use client";
import {useEffect,useMemo,useState,FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,RefreshCw} from "lucide-react";
type Party={id:string;name:string};
type Doc={id:string;number:string;grandTotal:string;paidAmount:string;invoiceDate:string;paymentStatus:string;customer?:Party|null;supplier?:Party|null};
export default function PaymentsPage(){
 const router=useRouter();const [masters,setMasters]=useState<any>({customers:[],suppliers:[]}),[sales,setSales]=useState<Doc[]>([]),[purchases,setPurchases]=useState<Doc[]>([]),[rows,setRows]=useState<any[]>([]);
 const [dir,setDir]=useState("IN"),[party,setParty]=useState(""),[documentId,setDocumentId]=useState(""),[amount,setAmount]=useState("0"),[method,setMethod]=useState("UPI"),[ref,setRef]=useState(""),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function load(){const [m,s,p,pay]=await Promise.all([fetch("/api/masters").then(r=>r.json()),fetch("/api/sales").then(r=>r.json()),fetch("/api/purchases").then(r=>r.json()),fetch("/api/payments").then(r=>r.json())]);setMasters(m);setSales(s.data||[]);setPurchases(p.data||[]);setRows(pay.data||[]);}
 useEffect(()=>{load().catch(()=>setError("Cannot load payment records"));},[]);
 const parties:Party[]=dir==="IN"?masters.customers:masters.suppliers;
 const docs=dir==="IN"?sales.filter(x=>Number(x.grandTotal)>Number(x.paidAmount)+.001):purchases.filter(x=>Number(x.grandTotal)>Number(x.paidAmount)+.001);
 const selected=docs.find(x=>x.id===documentId);
 const outstanding=selected?Math.max(0,Number(selected.grandTotal)-Number(selected.paidAmount)):0;
 function changeDirection(value:string){setDir(value);setDocumentId("");setParty("");setAmount("0");}
 function chooseDocument(id:string){setDocumentId(id);const d=docs.find(x=>x.id===id);const p=dir==="IN"?d?.customer:d?.supplier;setParty(p?.id||"");if(d)setAmount((Number(d.grandTotal)-Number(d.paidAmount)).toFixed(2));}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");try{
  const body={direction:dir,partyType:dir==="IN"?"CUSTOMER":"SUPPLIER",partyId:party||undefined,amount:Number(amount),method,referenceNumber:ref||undefined,referenceType:documentId?(dir==="IN"?"SALE":"PURCHASE"):undefined,referenceId:documentId||undefined};
  const r=await fetch("/api/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||"Payment failed");setMessage("Payment recorded and outstanding balance updated.");setAmount("0");setRef("");setDocumentId("");await load();
 }catch(e){setError(e instanceof Error?e.message:"Payment failed");}finally{setBusy(false);}}
 return <main className="page-content"><div className="page-heading"><div><div className="eyebrow">FINANCE / CASH & BANK</div><h1>Payments & receipts</h1><p>Allocate customer receipts and supplier payments to the correct invoice or bill.</p></div><div className="heading-actions"><button className="btn btn-light" onClick={()=>router.push("/")}><ArrowLeft size={14}/> Dashboard</button><button className="btn btn-light" onClick={()=>load()}><RefreshCw size={14}/> Refresh</button></div></div>{error&&<div className="notice error-notice">{error}</div>}{message&&<div className="notice">{message}</div>}<section className="panel"><div className="panel-header"><div><h3>Record payment</h3><p>Partial and full settlements are supported.</p></div></div><form className="form-grid" onSubmit={save} style={{marginTop:16}}>
 <label>Transaction type<select value={dir} onChange={e=>changeDirection(e.target.value)}><option value="IN">Customer receipt</option><option value="OUT">Supplier payment</option></select></label>
 <label>Allocate to invoice / bill<select value={documentId} onChange={e=>chooseDocument(e.target.value)}><option value="">Unallocated payment</option>{docs.map(x=><option key={x.id} value={x.id}>{x.number} · ₹{(Number(x.grandTotal)-Number(x.paidAmount)).toFixed(2)} due</option>)}</select></label>
 <label>{dir==="IN"?"Customer":"Supplier"}<select value={party} onChange={e=>setParty(e.target.value)}><option value="">Select party</option>{parties.map((x:Party)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
 <label>Amount received / paid (₹)<input type="number" min=".01" step=".01" max={documentId?outstanding:undefined} required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Payment method<select value={method} onChange={e=>setMethod(e.target.value)}>{["CASH","UPI","CARD","BANK_TRANSFER","CHEQUE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label>Bank / UPI / Cheque reference<input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Optional transaction reference"/></label>
 {selected&&<div className="full notice">Document total: <b>₹{Number(selected.grandTotal).toFixed(2)}</b> · Previously settled: <b>₹{Number(selected.paidAmount).toFixed(2)}</b> · Outstanding: <b>₹{outstanding.toFixed(2)}</b></div>}
 <div className="full"><button className="btn btn-primary" disabled={busy||Number(amount)<=0||Boolean(documentId&&Number(amount)>outstanding+.001)}>{busy?"Saving...":"Save payment"}</button></div>
 </form></section><section className="panel table-panel" style={{marginTop:15}}><div className="panel-header"><div><h3>Recent payments</h3><p>{rows.length} payment entries</p></div></div><div className="table-wrap"><table><thead><tr><th>DATE</th><th>DIRECTION</th><th>PARTY</th><th>REFERENCE</th><th>METHOD</th><th>AMOUNT</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.transactionDate).toLocaleDateString("en-IN")}</td><td>{x.direction==="IN"?"Receipt":"Payment"}</td><td>{x.partyType}</td><td>{x.referenceNumber||x.referenceId||"—"}</td><td>{x.method}</td><td><b>₹{Number(x.amount).toFixed(2)}</b></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-state">No payments recorded.</div>}</div></section></main>;
}
