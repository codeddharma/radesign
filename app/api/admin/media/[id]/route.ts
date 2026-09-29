import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { archiveMedia, deleteMedia } from "@/lib/admin/media";

/** `?permanent=1` also removes the asset from Cloudinary; the default archives. */
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  const permanent=new URL(request.url).searchParams.get("permanent")==="1";
  try{
    return NextResponse.json({media:permanent?await deleteMedia(id):await archiveMedia(id)});
  }catch(error){
    console.error("Media delete failed",error);
    return NextResponse.json({error:"Could not remove that asset."},{status:502});
  }
}
