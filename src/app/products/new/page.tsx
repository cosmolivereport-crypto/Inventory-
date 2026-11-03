"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function NewProduct(){
 const router=useRouter();
 const [name,setName]=useState(""); const [sku,setSku]=useState(""); const [price,setPrice]=useState("0"); const [cost,setCost]=useState("0"); const [stock,setStock]=useState("0"); const [error,setError]=useState("");
 async function save(e:any){e.preventDefault();setError("");const r=await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,sku,costPrice:Number(cost),sellingPrice:Number(price),mrp:Number(price),openingStock:Number(stock)})});const d=await r.json();if(!r.ok){setError(d.error||"Save failed");return;}router.push("/products");}
 return <main className="page-content"><h1>Add product</h1><p>Create a unique SKU for each pack or variant.</p><section className="panel"><form className="form-grid" onSubmit={save}><label>SKU *<input required value={sku} onChange={e=>setSku(e.target.value)}/></label><label>Product name *<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Cost price<input type="number" min="0" step=".01" value={cost} onChange={e=>setCost(e.target.value)}/></label><label>Selling price<input type="number" min="0" step=".01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Opening stock<input type="number" min="0" step=".001" value={stock} onChange={e=>setStock(e.target.value)}/></label><div>{error&&<p className="login-error">{error}</p>}<button className="btn btn-primary">Save product</button></div></form></section></main>;
}
