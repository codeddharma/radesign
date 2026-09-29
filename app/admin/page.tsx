import { redirect } from "next/navigation";
import "./admin.css";
import { isAdminAuthenticated,isAdminPasswordConfigured } from "@/lib/admin/auth";
import { listAdminProjects } from "@/lib/admin/projects";
import { getAdminSettings } from "@/lib/admin/settings";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
export default async function AdminPage(){if(!isAdminPasswordConfigured())return <main className="admin-shell"><h1>Admin setup required</h1><p>Set ADMIN_PASSWORD_HASH (generate it with <code>npm run admin:hash</code>) and ADMIN_SESSION_SECRET before using the admin panel.</p></main>;if(!(await isAdminAuthenticated()))redirect("/admin/login");const projects=await listAdminProjects();const settings=await getAdminSettings();return <AdminWorkspace initialProjects={projects} initialSettings={settings}/>} 
