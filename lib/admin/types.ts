import type { Img } from "@/lib/media";
import type { Project, ProjectCategory, ProjectStatus } from "@/lib/projects";
export type WorkflowState = "draft" | "ready" | "scheduled" | "published" | "archived" | "needs-review";
export interface AdminProject extends Project { id: string; workflow: WorkflowState; featured: boolean; seo: { title: string; description: string; noIndex: boolean }; updatedAt: string; publishedAt?: string; }
export interface ProjectInput { title:string; slug:string; type:ProjectCategory; year:number; location:string; area:string; status:ProjectStatus; lede:string; body:string[]; materials:string[]; credits:Project["credits"]; cover:Img; gallery:Img[]; featured:boolean; seo:AdminProject["seo"]; }
