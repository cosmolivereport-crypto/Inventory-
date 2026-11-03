export const products = [
 {id:"PRD-001",sku:"COS-HC-001",name:"Oceanbeauty Anti-dandruff Shampoo",category:"Hair Care",brand:"Oceanbeauty",stock:128,reorder:30,cost:185,mrp:349,batch:"OB-2610",expiry:"2027-10-30",status:"In stock"},
 {id:"PRD-002",sku:"COS-FW-002",name:"Gloinsta Face Wash",category:"Face Wash",brand:"Gloinsta",stock:18,reorder:25,cost:210,mrp:399,batch:"GL-2608",expiry:"2027-08-15",status:"Low stock"},
 {id:"PRD-003",sku:"COS-AG-003",name:"Aleva Face Wash Gel",category:"Face Wash",brand:"Aleva",stock:0,reorder:20,cost:145,mrp:299,batch:"AL-2607",expiry:"2027-07-20",status:"Out of stock"},
 {id:"PRD-004",sku:"COS-TX-004",name:"Melano TX Ultra HQ 4% Serum",category:"Serum",brand:"Melano",stock:64,reorder:15,cost:380,mrp:699,batch:"MT-2609",expiry:"2027-09-12",status:"In stock"},
 {id:"PRD-005",sku:"COS-TC-005",name:"Tretiva ACM 5-in-1 Cream 50ml",category:"Cream",brand:"Tretiva",stock:42,reorder:12,cost:295,mrp:549,batch:"TR-2611",expiry:"2027-11-01",status:"In stock"},
 {id:"PRD-006",sku:"COS-SO-006",name:"Cosmosentials Haldi & Chandan Soap",category:"Soap",brand:"Cosmosentials",stock:340,reorder:50,cost:28,mrp:79,batch:"CS-2610",expiry:"2028-03-01",status:"In stock"},
 {id:"PRD-007",sku:"COS-FW-007",name:"Acmed Face Wash Pack of 1",category:"Face Wash",brand:"Acmed",stock:2,reorder:15,cost:115,mrp:225,batch:"AC-2610",expiry:"2027-10-01",status:"Low stock"},
 {id:"PRD-008",sku:"COS-MS-008",name:"Viso CX Serum",category:"Serum",brand:"Viso",stock:9,reorder:12,cost:320,mrp:599,batch:"VC-2606",expiry:"2027-01-15",status:"Low stock"}
];
export const movements = [
 {id:"MOV-1042",date:"2026-11-03",type:"Sale",reference:"INV-2026-1042",product:"Oceanbeauty Anti-dandruff Shampoo",qty:-3,warehouse:"Main Warehouse",user:"Admin"},
 {id:"MOV-1041",date:"2026-11-03",type:"Purchase",reference:"PUR-2026-0281",product:"Gloinsta Face Wash",qty:40,warehouse:"Main Warehouse",user:"Saurav"},
 {id:"MOV-1040",date:"2026-11-02",type:"Adjustment",reference:"ADJ-00081",product:"Acmed Face Wash Pack of 1",qty:-1,warehouse:"Main Warehouse",user:"Ajay"},
 {id:"MOV-1039",date:"2026-11-02",type:"Sale",reference:"INV-2026-1041",product:"Melano TX Ultra HQ 4% Serum",qty:-2,warehouse:"Main Warehouse",user:"Admin"},
 {id:"MOV-1038",date:"2026-11-01",type:"Transfer",reference:"TRF-00021",product:"Cosmosentials Haldi & Chandan Soap",qty:-24,warehouse:"Store Room",user:"Suraj"}
];
export const sales = [
 {id:"INV-2026-1042",customer:"Retail Customer",date:"2026-11-03",amount:1047,status:"Paid"},
 {id:"INV-2026-1041",customer:"Priya Enterprises",date:"2026-11-02",amount:1198,status:"Paid"},
 {id:"INV-2026-1040",customer:"Walk-in Customer",date:"2026-11-02",amount:699,status:"Due"},
 {id:"INV-2026-1039",customer:"Aarav Medicals",date:"2026-11-01",amount:2196,status:"Paid"}
];
export const purchases = [
 {id:"PUR-2026-0281",supplier:"Beauty Wholesale India",date:"2026-11-03",amount:8400,status:"Received"},
 {id:"PUR-2026-0280",supplier:"Ocean Distribution",date:"2026-11-01",amount:16200,status:"Received"},
 {id:"PUR-2026-0279",supplier:"Derma Supply Co.",date:"2026-10-29",amount:6250,status:"Pending"}
];
export const chartData = [
 {name:"Jun",sales:142000,purchases:92000},{name:"Jul",sales:158000,purchases:101000},
 {name:"Aug",sales:149000,purchases:95000},{name:"Sep",sales:184000,purchases:112000},
 {name:"Oct",sales:206000,purchases:136000},{name:"Nov",sales:98000,purchases:64000}
];
