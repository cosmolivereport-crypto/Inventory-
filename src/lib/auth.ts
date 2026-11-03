import {jwtVerify,SignJWT} from "jose";
import type {Session} from "@/lib/session";
export const SESSION_COOKIE="cosmo_session";
const secret=()=>new TextEncoder().encode(process.env.AUTH_SECRET ?? "development-only-secret-change-before-deploy-please");
export async function signSession(session:Session){return new SignJWT(session).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("12h").sign(secret());}
export async function readSession(token:string):Promise<Session|null>{try{const {payload}=await jwtVerify(token,secret());if(!payload.userId||!payload.email||!payload.role)return null;return {userId:String(payload.userId),email:String(payload.email??""),role:String(payload.role)};}catch{return null;}}
