import { Placeholder } from "@/components/Placeholder";
import { Media } from "@/components/Media";
import type { TeamContent } from "@/lib/admin/settings";

export function StudioTeam({ gridClassName, team, showImages = true }: { gridClassName: string; team: TeamContent[]; showImages?: boolean }) {
  return <section className={gridClassName} id="team">{team.map((member, index) => <article className="p reveal" key={`${member.name}-${index}`}>
    {showImages && <div className="img img-mask">{member.image ? <Media src={member.image.src} alt={member.image.alt || member.name} fill sizes="(max-width:720px) 50vw, 25vw" style={{ height: "100%" }} /> : <Placeholder variant={index % 2 ? "basalt" : "stone"} />}</div>}
    <h3 className="name">{member.name}</h3><div className="role">{member.role}</div>
  </article>)}</section>;
}
