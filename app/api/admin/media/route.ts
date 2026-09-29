import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { listMedia, saveUpload } from "@/lib/admin/media";
import { isCloudinaryConfigured } from "@/lib/admin/cloudinary";

export async function GET(){if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json({media:await listMedia()});}

export async function POST(request:Request){
  if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!isCloudinaryConfigured())return NextResponse.json({error:"Image hosting is not configured. Set the CLOUDINARY_* environment variables."},{status:503});
  const form=await request.formData();
  const file=form.get("file");
  if(!(file instanceof File))return NextResponse.json({error:"Image file is required."},{status:400});
  const allowed=["image/jpeg","image/png","image/webp","image/gif"];
  if(!allowed.includes(file.type))return NextResponse.json({error:"Use JPG, PNG, WebP, or GIF."},{status:400});
  if(file.size>25*1024*1024)return NextResponse.json({error:"Images must be under 25 MB."},{status:400});
  const alt=String(form.get("alt")??"").trim();
  const credit=String(form.get("credit")??"").trim();
  if(!alt)return NextResponse.json({error:"Alt text is required."},{status:400});
  // Cloudinary reports the real dimensions, so no header parsing is needed here.
  const bytes=new Uint8Array(await file.arrayBuffer());
  try{
    return NextResponse.json({asset:await saveUpload(file,bytes,alt,credit)},{status:201});
  }catch(error){
    console.error("Media upload failed",error);
    return NextResponse.json({error:"Upload failed. Please try again."},{status:502});
  }
}
