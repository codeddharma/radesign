"use server";
import { cookies } from "next/headers";
import { adminCookieName } from "@/lib/admin/auth";
export async function logout(){(await cookies()).delete(adminCookieName);}
