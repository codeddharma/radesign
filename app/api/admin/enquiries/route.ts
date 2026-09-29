import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { listEnquiries } from "@/lib/admin/inquiries";
export async function GET(){if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json({enquiries:await listEnquiries()});}
