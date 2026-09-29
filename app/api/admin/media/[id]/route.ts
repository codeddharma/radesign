import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { archiveMedia } from "@/lib/admin/media";
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});const {id}=await params;return NextResponse.json({media:await archiveMedia(id)});}
