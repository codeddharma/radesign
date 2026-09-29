import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
const COOKIE="ra_admin_session"; const expected=()=>process.env.ADMIN_PASSWORD??"";
// The supplied local password is accepted at 8+ characters; use a longer value in production.
export function isAdminPasswordConfigured(){return expected().length>=8;}
export function adminEmail(){return process.env.ADMIN_EMAIL??"";}
export function credentialsMatch(email:string,value:string){const a=createHash("sha256").update(value).digest();const b=createHash("sha256").update(expected()).digest();return email.trim().toLowerCase()===adminEmail().trim().toLowerCase()&&expected().length>0&&timingSafeEqual(a,b);}
export async function isAdminAuthenticated(){return (await cookies()).get(COOKIE)?.value===process.env.ADMIN_SESSION_SECRET&&Boolean(process.env.ADMIN_SESSION_SECRET);}
export const adminCookieName=COOKIE;
