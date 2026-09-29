import { NextResponse } from "next/server";
import { adminCookieName } from "@/lib/admin/auth";
export async function POST(){const response=NextResponse.json({ok:true});for(const path of ["/","/admin"]){response.cookies.set(adminCookieName,"",{httpOnly:true,maxAge:0,path});}return response;}
