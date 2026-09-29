"use server";
import { cookies } from "next/headers";
import { adminCookieName, destroyAdminSession } from "@/lib/admin/auth";
export async function logout(){const jar=await cookies();await destroyAdminSession(jar.get(adminCookieName)?.value);jar.delete(adminCookieName);}
