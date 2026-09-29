import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { createAdminProject,listAdminProjects } from "@/lib/admin/projects";
import { validateProject } from "@/lib/admin/validation";
export async function GET(){if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json({projects:await listAdminProjects()})}
export async function POST(request:Request){if(!(await isAdminAuthenticated()))return NextResponse.json({error:"Unauthorized"},{status:401});const input=await request.json();const issues=validateProject(input);if(issues.some(issue=>issue.severity==="error"))return NextResponse.json({issues},{status:400});return NextResponse.json({project:await createAdminProject(input),issues},{status:201})}
