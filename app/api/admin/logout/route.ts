import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, destroyAdminSession } from "@/lib/admin/auth";
export async function POST(){
  // Revoke server-side first: clearing the cookie alone would leave a still-valid
  // session usable by anyone who had copied it.
  await destroyAdminSession((await cookies()).get(adminCookieName)?.value);
  const response=NextResponse.json({ok:true});
  for(const path of ["/","/admin"]){response.cookies.set(adminCookieName,"",{httpOnly:true,maxAge:0,path});}
  return response;
}
