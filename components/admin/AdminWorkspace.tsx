"use client";
/* Admin previews intentionally use the existing public asset URLs. */
/* eslint-disable @next/next/no-img-element */
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import type { Img } from "@/lib/media";
import type { AdminProject } from "@/lib/admin/types";
import type { AdminSettings } from "@/lib/admin/settings";
import type { MediaAsset } from "@/lib/admin/media";
import type { Enquiry } from "@/lib/admin/inquiries";

type Tab = "overview" | "projects" | "homepage" | "studio" | "press" | "careers" | "contact" | "media" | "enquiries";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "homepage", label: "Homepage" },
  { id: "studio", label: "Studio page" },
  { id: "press", label: "Press" },
  { id: "careers", label: "Careers" },
  { id: "contact", label: "Contact & site" },
  { id: "media", label: "Media library" },
  { id: "enquiries", label: "Enquiries" },
];

function assetToImage(asset: MediaAsset): Img {
  return { src: asset.src, w: asset.width, h: asset.height, alt: asset.alt, credit: asset.credit };
}

export function AdminWorkspace({ initialProjects, initialSettings }: { initialProjects: AdminProject[]; initialSettings: AdminSettings }) {
  const [active, setActive] = useState<Tab>("overview");
  const [projects, setProjects] = useState(initialProjects);
  const [settings, setSettings] = useState(initialSettings);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [selected, setSelected] = useState<AdminProject | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMedia() {
    if (media.length > 0) return;
    const response = await fetch("/api/admin/media");
    const data = await response.json();
    if (response.ok) setMedia(data.media);
  }

  async function openTab(tab: Tab) {
    setActive(tab);
    setMessage("");
    if (["media", "projects", "homepage", "studio", "careers"].includes(tab)) await loadMedia();
    if (tab === "enquiries") {
      const response = await fetch("/api/admin/enquiries");
      const data = await response.json();
      if (response.ok) setEnquiries(data.enquiries);
    }
  }

  function changeSelected(update: (project: AdminProject) => AdminProject) {
    setSelected((project) => (project ? update(project) : project));
  }

  function addExistingImage(src: string) {
    const asset = media.find((item) => item.src === src);
    if (!asset || !selected || selected.gallery.some((image) => image.src === src)) return;
    const image = assetToImage(asset);
    changeSelected((project) => ({
      ...project,
      gallery: [...project.gallery, image],
      cover: project.gallery.length === 0 ? image : project.cover,
    }));
    setMessage("Image added. Save the project to keep this change.");
  }

  function removeProjectImage(src: string) {
    if (!selected) return;
    if (selected.gallery.length <= 1) {
      setMessage("Keep at least one image in the project.");
      return;
    }
    changeSelected((project) => {
      const gallery = project.gallery.filter((image) => image.src !== src);
      const cover = project.cover.src === src ? gallery[0] : project.cover;
      return { ...project, gallery, cover };
    });
    setMessage("Image removed from this project. Save the project to keep this change.");
  }

  function setProjectCover(src: string) {
    const image = selected?.gallery.find((item) => item.src === src);
    if (!image) return;
    changeSelected((project) => ({ ...project, cover: image }));
    setMessage("Cover changed. Save the project to keep this change.");
  }

  async function uploadProjectImage(file: File, alt: string, credit: string) {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    form.append("alt", alt || `${selected.title} image`);
    form.append("credit", credit);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Upload failed");
      return;
    }
    const asset = data.asset as MediaAsset;
    setMedia((all) => [asset, ...all]);
    const image = assetToImage(asset);
    changeSelected((project) => ({
      ...project,
      gallery: [...project.gallery, image],
      cover: project.gallery.length === 0 ? image : project.cover,
    }));
    setMessage("Image uploaded and added. Save the project to publish the attachment.");
  }

  async function saveProject(workflow?: AdminProject["workflow"]) {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/projects/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...selected, workflow }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.issues?.map((issue: { message: string }) => issue.message).join(" · ") ?? data.error ?? "Could not save");
      return;
    }
    setProjects((all) => all.map((project) => (project.id === data.project.id ? data.project : project)));
    setSelected(data.project);
    setMessage(workflow === "published" ? "Published successfully" : workflow === "archived" ? "Project archived" : "Project saved");
  }

  async function createProject() {
    setBusy(true);
    setMessage("");
    let library = media;
    if (library.length === 0) {
      const response = await fetch("/api/admin/media");
      const data = await response.json();
      if (response.ok) {
        library = data.media;
        setMedia(library);
      }
    }
    const asset = library.find((item) => !item.archived);
    if (!asset) {
      setBusy(false);
      setMessage("Upload an image to the Media library before creating a project.");
      return;
    }
    const image = assetToImage(asset);
    const stamp = Date.now().toString(36);
    const input = {
      title: "Untitled project", slug: `untitled-${stamp}`, type: "Architecture" as const, year: new Date().getFullYear(), location: "Location to be confirmed", area: "—", status: "In progress" as const,
      lede: "Add a short project description.", body: ["Add the project story."], materials: [], credits: { lead: "R.A. Design Studio" }, cover: image, gallery: [image], featured: false,
      seo: { title: "Untitled project", description: "Add a search description.", noIndex: true },
    };
    const response = await fetch("/api/admin/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(data.issues?.map((issue: { message: string }) => issue.message).join(" · ") ?? data.error ?? "Could not create project"); return; }
    setProjects((all) => [data.project, ...all]);
    setSelected(data.project);
    setMessage("Draft project created. Add its details and images before publishing.");
  }

  async function saveSettings() {
    setBusy(true);
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    const data = await response.json();
    setBusy(false);
    setMessage(response.ok ? "Site settings saved" : data.error ?? "Could not save settings");
    if (response.ok) setSettings(data.settings);
  }

  async function uploadToLibrary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Upload failed");
      return;
    }
    setMedia((all) => [data.asset, ...all]);
    event.currentTarget.reset();
    setMessage("Image uploaded to the asset library");
  }

  async function archiveAsset(id: string) {
    const response = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    if (response.ok) {
      const data = await response.json();
      setMedia(data.media);
      setMessage("Asset archived from the library");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const attention = projects.filter((project) => project.workflow === "needs-review").length;
  return (
    <main className="admin-app">
      <header className="admin-topbar">
        <div><p className="admin-kicker">R.A. Design Studio</p><strong>Content desk</strong></div>
        <div className="admin-top-actions"><span>Administrator</span><button onClick={logout}>Sign out</button></div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <nav aria-label="Admin sections">
            {tabs.map((tab) => <button key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => openTab(tab.id)}>{tab.label}{tab.id === "enquiries" && enquiries.length > 0 ? <span>{enquiries.length}</span> : null}</button>)}
          </nav>
          <div className="admin-sidebar-foot">Local admin · SQLite<br />Assets: public/media</div>
        </aside>
        <section className="admin-main">
          {message && <div className="admin-toast" role="status">{message}</div>}
          {active === "overview" && <Overview projects={projects} attention={attention} onOpen={openTab} />}
          {active === "projects" && <Projects projects={projects} selected={selected} setSelected={setSelected} media={media} save={saveProject} create={createProject} busy={busy} uploadImage={uploadProjectImage} addExisting={addExistingImage} removeImage={removeProjectImage} setCover={setProjectCover} />}
          {active === "homepage" && <HomepageEditor settings={settings} setSettings={setSettings} save={saveSettings} busy={busy} media={media} />}
          {active === "studio" && <StudioEditor settings={settings} setSettings={setSettings} save={saveSettings} busy={busy} media={media} />}
          {active === "press" && <PressEditor settings={settings} setSettings={setSettings} save={saveSettings} busy={busy} />}
          {active === "careers" && <CareersEditor settings={settings} setSettings={setSettings} save={saveSettings} busy={busy} media={media} />}
          {active === "contact" && <Settings settings={settings} setSettings={setSettings} save={saveSettings} busy={busy} />}
          {active === "media" && <MediaLibrary media={media} upload={uploadToLibrary} archive={archiveAsset} busy={busy} />}
          {active === "enquiries" && <Enquiries enquiries={enquiries} />}
        </section>
      </div>
    </main>
  );
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="admin-page-title"><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>;
}

function Overview({ projects, attention, onOpen }: { projects: AdminProject[]; attention: number; onOpen: (tab: Tab) => void }) {
  return <><PageTitle eyebrow="Overview" title="Your website, at a glance." description="Every public page now has its own editor. Choose a page and update only what belongs there." /><div className="admin-stat-grid"><button onClick={() => onOpen("projects")}><small>Needs review</small><strong>{attention}</strong><span>Project drafts</span></button><button onClick={() => onOpen("projects")}><small>Published work</small><strong>{projects.filter((project) => project.workflow === "published").length}</strong><span>Live projects</span></button><button onClick={() => onOpen("press")}><small>Press page</small><strong>→</strong><span>Edit coverage</span></button><button onClick={() => onOpen("enquiries")}><small>Inbox</small><strong>→</strong><span>View enquiries</span></button></div><div className="admin-card admin-quick"><div><p className="admin-kicker">Page editors</p><h2>Choose what you want to change.</h2></div><div className="admin-quick-actions"><button onClick={() => onOpen("homepage")}>Homepage →</button><button onClick={() => onOpen("studio")}>Studio →</button><button onClick={() => onOpen("press")}>Press →</button><button onClick={() => onOpen("careers")}>Careers →</button><button onClick={() => onOpen("contact")}>Contact →</button></div></div></>;
}

function Projects({ projects, selected, setSelected, media, save, create, busy, uploadImage, addExisting, removeImage, setCover }: { projects: AdminProject[]; selected: AdminProject | null; setSelected: (project: AdminProject | null) => void; media: MediaAsset[]; save: (workflow?: AdminProject["workflow"]) => void; create: () => Promise<void>; busy: boolean; uploadImage: (file: File, alt: string, credit: string) => Promise<void>; addExisting: (src: string) => void; removeImage: (src: string) => void; setCover: (src: string) => void }) {
  return <><PageTitle eyebrow="Content / Projects" title="Projects" description="Create, edit, publish, archive, and manage every project image from the same screen." /><div className="admin-split"><div className="admin-card project-list"><div className="admin-card-head"><div><h2>All projects</h2><span>{projects.length} records</span></div><button type="button" onClick={create} disabled={busy}>New project</button></div>{projects.map((project) => <button key={project.id} className={selected?.id === project.id ? "selected" : ""} onClick={() => setSelected(project)}><span><strong>{project.title}</strong><small>{project.location} · {project.type}</small></span><em className={`status ${project.workflow}`}>{project.workflow}</em></button>)}</div>{selected ? <ProjectEditor project={selected} setProject={setSelected} media={media} save={save} busy={busy} uploadImage={uploadImage} addExisting={addExisting} removeImage={removeImage} setCover={setCover} /> : <div className="admin-card admin-empty"><p>Select a project to edit it, or create a new draft.</p></div>}</div></>;
}

function ProjectEditor({ project, setProject, media, save, busy, uploadImage, addExisting, removeImage, setCover }: { project: AdminProject; setProject: (project: AdminProject) => void; media: MediaAsset[]; save: (workflow?: AdminProject["workflow"]) => void; busy: boolean; uploadImage: (file: File, alt: string, credit: string) => Promise<void>; addExisting: (src: string) => void; removeImage: (src: string) => void; setCover: (src: string) => void }) {
  const [imageAlt, setImageAlt] = useState("");
  const [imageCredit, setImageCredit] = useState("");
  const [existingSrc, setExistingSrc] = useState("");
  const availableAssets = useMemo(() => media.filter((asset) => !asset.archived && !project.gallery.some((image) => image.src === asset.src)), [media, project.gallery]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImage(file, imageAlt, imageCredit);
    event.target.value = "";
    setImageAlt("");
    setImageCredit("");
  }

  return <div className="admin-card project-editor">
    <div className="admin-card-head"><div><p className="admin-kicker">Editing project</p><h2>{project.title}</h2></div><em className={`status ${project.workflow}`}>{project.workflow}</em></div>
    <div className="admin-section-label">Project details</div>
    <label>Project title<input value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} /></label>
    <label>URL slug<input value={project.slug} onChange={(event) => setProject({ ...project, slug: event.target.value })} /></label>
    <div className="admin-two-col"><label>Project type<select value={project.type} onChange={(event) => setProject({ ...project, type: event.target.value as AdminProject["type"] })}><option>Architecture</option><option>Interior</option><option>Landscape</option><option>Planning</option></select></label><label>Build status<select value={project.status} onChange={(event) => setProject({ ...project, status: event.target.value as AdminProject["status"] })}><option>Built</option><option>In progress</option></select></label></div>
    <div className="admin-two-col"><label>Location<input value={project.location} onChange={(event) => setProject({ ...project, location: event.target.value })} /></label><label>Year<input type="number" value={project.year} onChange={(event) => setProject({ ...project, year: Number(event.target.value) })} /></label></div>
    <label>Area / scale<input value={project.area} onChange={(event) => setProject({ ...project, area: event.target.value })} placeholder="e.g. 2,000 sq.m" /></label>
    <label>Short description<textarea value={project.lede} onChange={(event) => setProject({ ...project, lede: event.target.value })} /></label>
    <label>Project story <small>One paragraph per line</small><textarea value={project.body.join("\n")} onChange={(event) => setProject({ ...project, body: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
    <label>Materials <small>Separate with commas</small><input value={project.materials.join(", ")} onChange={(event) => setProject({ ...project, materials: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
    <div className="admin-two-col"><label>Project lead<input value={project.credits.lead} onChange={(event) => setProject({ ...project, credits: { ...project.credits, lead: event.target.value } })} /></label><label>Team<input value={project.credits.team ?? ""} onChange={(event) => setProject({ ...project, credits: { ...project.credits, team: event.target.value } })} /></label></div>
    <div className="admin-two-col"><label>Landscape credit<input value={project.credits.landscape ?? ""} onChange={(event) => setProject({ ...project, credits: { ...project.credits, landscape: event.target.value } })} /></label><label>Photography credit<input value={project.credits.photo ?? ""} onChange={(event) => setProject({ ...project, credits: { ...project.credits, photo: event.target.value } })} /></label></div>
    <ProjectImages project={project} media={media} availableAssets={availableAssets} imageAlt={imageAlt} setImageAlt={setImageAlt} imageCredit={imageCredit} setImageCredit={setImageCredit} existingSrc={existingSrc} setExistingSrc={setExistingSrc} onUpload={handleUpload} addExisting={addExisting} removeImage={removeImage} setCover={setCover} busy={busy} />
    <div className="admin-section-label">Homepage & search</div>
    <label className="admin-check"><input type="checkbox" checked={project.featured} onChange={(event) => setProject({ ...project, featured: event.target.checked })} /> Feature this project on the homepage</label>
    <label>SEO title<input value={project.seo.title} onChange={(event) => setProject({ ...project, seo: { ...project.seo, title: event.target.value } })} /></label>
    <label>SEO description<textarea value={project.seo.description} onChange={(event) => setProject({ ...project, seo: { ...project.seo, description: event.target.value } })} /></label>
    <label className="admin-check"><input type="checkbox" checked={project.seo.noIndex} onChange={(event) => setProject({ ...project, seo: { ...project.seo, noIndex: event.target.checked } })} /> Keep this project out of search engines</label>
    <div className="admin-actions"><button onClick={() => save()} disabled={busy}>Save draft</button><button onClick={() => save("published")} disabled={busy}>Publish changes</button><button className="danger" onClick={() => save("archived")} disabled={busy}>Archive</button></div>
  </div>;
}

function ProjectImages({ project, media, availableAssets, imageAlt, setImageAlt, imageCredit, setImageCredit, existingSrc, setExistingSrc, onUpload, addExisting, removeImage, setCover, busy }: { project: AdminProject; media: MediaAsset[]; availableAssets: MediaAsset[]; imageAlt: string; setImageAlt: (value: string) => void; imageCredit: string; setImageCredit: (value: string) => void; existingSrc: string; setExistingSrc: (value: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; addExisting: (src: string) => void; removeImage: (src: string) => void; setCover: (src: string) => void; busy: boolean }) {
  return <section className="project-images"><div className="project-images-head"><div><p className="admin-kicker">Project images</p><h3>{project.gallery.length} images attached</h3><p>Upload new images or reuse an existing asset. Changes are kept when you save the project.</p></div><span className="project-cover-note">Cover: {project.cover.src.split("/").pop()}</span></div><div className="project-image-tools"><div className="project-upload"><label>Alt text for new image<input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe what is shown" /></label><label>Credit<input value={imageCredit} onChange={(event) => setImageCredit(event.target.value)} placeholder="Photographer / rights credit" /></label><label className="project-file-button"><span>{busy ? "Uploading…" : "Upload image"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUpload} disabled={busy} /></label></div><div className="project-existing"><label>Reuse an existing asset<select value={existingSrc} onChange={(event) => setExistingSrc(event.target.value)}><option value="">Choose from media library</option>{availableAssets.map((asset) => <option key={asset.id} value={asset.src}>{asset.filename}</option>)}</select></label><button type="button" onClick={() => { if (existingSrc) { addExisting(existingSrc); setExistingSrc(""); } }} disabled={!existingSrc}>Add selected image</button></div></div><div className="project-image-grid">{project.gallery.map((image, index) => <article className="project-image-card" key={`${image.src}-${index}`}><div className="project-image-preview"><img src={image.src} alt={image.alt ?? ""} />{project.cover.src === image.src && <span className="project-cover-badge">Cover</span>}</div><div className="project-image-card-meta"><strong>{image.src.split("/").pop()}</strong><small>{image.w} × {image.h}</small><div><button type="button" onClick={() => setCover(image.src)} disabled={project.cover.src === image.src}>Set cover</button><button type="button" className="remove-image" onClick={() => removeImage(image.src)} disabled={project.gallery.length <= 1}>Remove</button></div></div></article>)}</div></section>;
}

function SaveButton({ save, busy, label = "Save page" }: { save: () => void; busy: boolean; label?: string }) {
  return <div className="cms-save"><span>Changes appear on the public site after saving.</span><button type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : label}</button></div>;
}

function ImagePicker({ label, value, media, onChange }: { label: string; value: Img | null; media: MediaAsset[]; onChange: (image: Img | null) => void }) {
  return <label>{label}<select value={value?.src ?? ""} onChange={(event) => { const asset = media.find((item) => item.src === event.target.value); onChange(asset ? assetToImage(asset) : null); }}><option value="">No image / placeholder</option>{media.filter((asset) => !asset.archived).map((asset) => <option key={asset.id} value={asset.src}>{asset.filename}</option>)}</select></label>;
}

function HomepageEditor({ settings, setSettings, save, busy, media }: { settings: AdminSettings; setSettings: (settings: AdminSettings) => void; save: () => void; busy: boolean; media: MediaAsset[] }) {
  const page = settings.homepage; const update = (next: Partial<typeof page>) => setSettings({ ...settings, homepage: { ...page, ...next } }); const [heroAsset, setHeroAsset] = useState("");
  return <><PageTitle eyebrow="Pages / Homepage" title="Homepage" description="Manage the hero, service offering, process, statistics, client quotes, press strip and studio call-to-action." /><div className="cms-stack">
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Hero</p><h2>First impression</h2></div></div><div className="admin-two-col"><label>Hero title<input value={settings.heroTitle} onChange={(event) => setSettings({ ...settings, heroTitle: event.target.value })} /></label><label>Emphasised line<input value={settings.heroEmphasis} onChange={(event) => setSettings({ ...settings, heroEmphasis: event.target.value })} /></label></div><label>Based in<input value={settings.heroBasedIn} onChange={(event) => setSettings({ ...settings, heroBasedIn: event.target.value })} /></label><div className="cms-media-row"><label>Add carousel image<select value={heroAsset} onChange={(event) => setHeroAsset(event.target.value)}><option value="">Choose from Media library</option>{media.filter((asset) => !asset.archived && !settings.heroImages.some((image) => image.src === asset.src)).map((asset) => <option key={asset.id} value={asset.src}>{asset.filename}</option>)}</select></label><button type="button" disabled={!heroAsset} onClick={() => { const asset = media.find((item) => item.src === heroAsset); if (asset) setSettings({ ...settings, heroImages: [...settings.heroImages, assetToImage(asset)] }); setHeroAsset(""); }}>Add image</button></div><div className="project-image-grid">{settings.heroImages.map((image, index) => <article className="project-image-card" key={`${image.src}-${index}`}><div className="project-image-preview"><img src={image.src} alt={image.alt ?? ""} />{index === 0 && <span className="project-cover-badge">First slide</span>}</div><div className="project-image-card-meta"><strong>{image.src.split("/").pop()}</strong><div><button type="button" disabled={index === 0} onClick={() => setSettings({ ...settings, heroImages: [image, ...settings.heroImages.filter((_, itemIndex) => itemIndex !== index)] })}>Make first</button><button type="button" className="remove-image" disabled={settings.heroImages.length <= 1} onClick={() => setSettings({ ...settings, heroImages: settings.heroImages.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div></div></article>)}</div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Services</p><h2>What we do</h2></div><button type="button" onClick={() => update({ services: [...page.services, { title: "New service", description: "Describe this service." }] })}>Add service</button></div><label>Section label<input value={page.servicesEyebrow} onChange={(event) => update({ servicesEyebrow: event.target.value })} /></label><label>Heading<input value={page.servicesTitle} onChange={(event) => update({ servicesTitle: event.target.value })} /></label><label>Introduction<textarea value={page.servicesDescription} onChange={(event) => update({ servicesDescription: event.target.value })} /></label><div className="cms-collection">{page.services.map((item, index) => <article className="cms-item" key={index}><div className="cms-item-head"><strong>Service {index + 1}</strong><button type="button" onClick={() => update({ services: page.services.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label>Name<input value={item.title} onChange={(event) => update({ services: page.services.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry) })} /></label><label>Description<textarea value={item.description} onChange={(event) => update({ services: page.services.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) })} /></label></article>)}</div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Process</p><h2>How we work</h2></div><button type="button" onClick={() => update({ process: [...page.process, { title: "New step", description: "Describe this step." }] })}>Add step</button></div><label>Section label<input value={page.processEyebrow} onChange={(event) => update({ processEyebrow: event.target.value })} /></label><label>Heading<input value={page.processTitle} onChange={(event) => update({ processTitle: event.target.value })} /></label><label>Introduction<textarea value={page.processDescription} onChange={(event) => update({ processDescription: event.target.value })} /></label><div className="cms-collection">{page.process.map((item, index) => <article className="cms-item" key={index}><div className="cms-item-head"><strong>Step {index + 1}</strong><button type="button" onClick={() => update({ process: page.process.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label>Title<input value={item.title} onChange={(event) => update({ process: page.process.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry) })} /></label><label>Description<textarea value={item.description} onChange={(event) => update({ process: page.process.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) })} /></label></article>)}</div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Proof</p><h2>Statistics & testimonials</h2></div></div><div className="cms-collection compact">{page.stats.map((item, index) => <article className="cms-item" key={index}><div className="admin-two-col"><label>Value<input value={item.value} onChange={(event) => update({ stats: page.stats.map((entry, itemIndex) => itemIndex === index ? { ...entry, value: event.target.value } : entry) })} /></label><label>Suffix<input value={item.suffix} onChange={(event) => update({ stats: page.stats.map((entry, itemIndex) => itemIndex === index ? { ...entry, suffix: event.target.value } : entry) })} /></label></div><label>Label<input value={item.label} onChange={(event) => update({ stats: page.stats.map((entry, itemIndex) => itemIndex === index ? { ...entry, label: event.target.value } : entry) })} /></label></article>)}</div><div className="admin-card-head nested"><h2>Client quotes</h2><button type="button" onClick={() => update({ testimonials: [...page.testimonials, { quote: "New client quote", name: "Client name", role: "Role / project" }] })}>Add quote</button></div><label>Section label<input value={page.testimonialsEyebrow} onChange={(event) => update({ testimonialsEyebrow: event.target.value })} /></label><div className="cms-collection">{page.testimonials.map((item, index) => <article className="cms-item" key={index}><div className="cms-item-head"><strong>Quote {index + 1}</strong><button type="button" disabled={page.testimonials.length <= 1} onClick={() => update({ testimonials: page.testimonials.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label>Quote<textarea value={item.quote} onChange={(event) => update({ testimonials: page.testimonials.map((entry, itemIndex) => itemIndex === index ? { ...entry, quote: event.target.value } : entry) })} /></label><div className="admin-two-col"><label>Name<input value={item.name} onChange={(event) => update({ testimonials: page.testimonials.map((entry, itemIndex) => itemIndex === index ? { ...entry, name: event.target.value } : entry) })} /></label><label>Role / project<input value={item.role} onChange={(event) => update({ testimonials: page.testimonials.map((entry, itemIndex) => itemIndex === index ? { ...entry, role: event.target.value } : entry) })} /></label></div></article>)}</div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Closing sections</p><h2>Press & studio invitation</h2></div></div><div className="admin-two-col"><label>Press label<input value={page.pressEyebrow} onChange={(event) => update({ pressEyebrow: event.target.value })} /></label><label>Press heading<input value={page.pressTitle} onChange={(event) => update({ pressTitle: event.target.value })} /></label></div><label>Studio label<input value={page.ctaEyebrow} onChange={(event) => update({ ctaEyebrow: event.target.value })} /></label><label>Studio message<textarea value={page.ctaTitle} onChange={(event) => update({ ctaTitle: event.target.value })} /></label></section>
    <SaveButton save={save} busy={busy} label="Save homepage" />
  </div></>;
}

function StudioEditor({ settings, setSettings, save, busy, media }: { settings: AdminSettings; setSettings: (settings: AdminSettings) => void; save: () => void; busy: boolean; media: MediaAsset[] }) {
  const page = settings.studioPage; const update = (next: Partial<typeof page>) => setSettings({ ...settings, studioPage: { ...page, ...next } });
  return <><PageTitle eyebrow="Pages / Studio" title="Studio page" description="Edit the studio story, founders and team roster. Portraits come from the Media library." /><div className="cms-stack"><section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Page introduction</p><h2>Story</h2></div></div><label>SEO description<textarea value={page.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} /></label><label>Eyebrow<input value={page.eyebrow} onChange={(event) => update({ eyebrow: event.target.value })} /></label><div className="admin-two-col"><label>Heading<input value={page.title} onChange={(event) => update({ title: event.target.value })} /></label><label>Emphasised word<input value={page.emphasis} onChange={(event) => update({ emphasis: event.target.value })} /></label></div><label>Introduction <small>One paragraph per line</small><textarea value={page.intro.join("\n")} onChange={(event) => update({ intro: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Leadership</p><h2>Founders</h2></div><button type="button" onClick={() => update({ founders: [...page.founders, { name: "New founder", bio: "Founder biography", image: null }] })}>Add founder</button></div><div className="cms-collection">{page.founders.map((item, index) => <article className="cms-item" key={index}><div className="cms-item-head"><strong>Founder {index + 1}</strong><button type="button" onClick={() => update({ founders: page.founders.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label>Name<input value={item.name} onChange={(event) => update({ founders: page.founders.map((entry, itemIndex) => itemIndex === index ? { ...entry, name: event.target.value } : entry) })} /></label><label>Biography<textarea value={item.bio} onChange={(event) => update({ founders: page.founders.map((entry, itemIndex) => itemIndex === index ? { ...entry, bio: event.target.value } : entry) })} /></label><ImagePicker label="Portrait" value={item.image} media={media} onChange={(image) => update({ founders: page.founders.map((entry, itemIndex) => itemIndex === index ? { ...entry, image } : entry) })} /></article>)}</div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">People</p><h2>Team roster</h2></div><button type="button" onClick={() => update({ team: [...page.team, { name: "New team member", role: "Role", image: null }] })}>Add person</button></div><label>Section heading<input value={page.teamTitle} onChange={(event) => update({ teamTitle: event.target.value })} /></label><div className="cms-collection compact">{page.team.map((item, index) => <article className="cms-item" key={index}><div className="cms-item-head"><strong>Person {index + 1}</strong><button type="button" onClick={() => update({ team: page.team.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label>Name<input value={item.name} onChange={(event) => update({ team: page.team.map((entry, itemIndex) => itemIndex === index ? { ...entry, name: event.target.value } : entry) })} /></label><label>Role<input value={item.role} onChange={(event) => update({ team: page.team.map((entry, itemIndex) => itemIndex === index ? { ...entry, role: event.target.value } : entry) })} /></label><ImagePicker label="Photo" value={item.image} media={media} onChange={(image) => update({ team: page.team.map((entry, itemIndex) => itemIndex === index ? { ...entry, image } : entry) })} /></article>)}</div></section><SaveButton save={save} busy={busy} label="Save studio page" /></div></>;
}

function PressEditor({ settings, setSettings, save, busy }: { settings: AdminSettings; setSettings: (settings: AdminSettings) => void; save: () => void; busy: boolean }) {
  const page = settings.pressPage; const update = (next: Partial<typeof page>) => setSettings({ ...settings, pressPage: { ...page, ...next } });
  return <><PageTitle eyebrow="Pages / Press" title="Press" description="Add, edit or remove publications and coverage links. The public archive is automatically sorted by year." /><div className="cms-stack"><section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Page introduction</p><h2>Press heading</h2></div></div><label>SEO description<textarea value={page.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} /></label><div className="admin-two-col"><label>Emphasised word<input value={page.emphasis} onChange={(event) => update({ emphasis: event.target.value })} /></label><label>Heading after emphasis<input value={page.titleAfter} onChange={(event) => update({ titleAfter: event.target.value })} /></label></div><label>Introduction<textarea value={page.intro} onChange={(event) => update({ intro: event.target.value })} /></label><label>Featured publication names <small>One per line</small><textarea value={page.logos.join("\n")} onChange={(event) => update({ logos: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label><div className="admin-two-col"><label>Archive label<input value={page.archiveEyebrow} onChange={(event) => update({ archiveEyebrow: event.target.value })} /></label><label>Archive heading<input value={page.archiveTitle} onChange={(event) => update({ archiveTitle: event.target.value })} /></label></div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Coverage</p><h2>{page.entries.length} press items</h2></div><button type="button" onClick={() => update({ entries: [{ publication: "Publication", title: "Article or award title", year: new Date().getFullYear(), url: "https://" }, ...page.entries] })}>Add press item</button></div><div className="cms-collection">{page.entries.map((item, index) => <article className="cms-item" key={index}><div className="cms-item-head"><strong>Coverage {index + 1}</strong><button type="button" onClick={() => update({ entries: page.entries.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><div className="admin-two-col"><label>Publication<input value={item.publication} onChange={(event) => update({ entries: page.entries.map((entry, itemIndex) => itemIndex === index ? { ...entry, publication: event.target.value } : entry) })} /></label><label>Year<input type="number" value={item.year} onChange={(event) => update({ entries: page.entries.map((entry, itemIndex) => itemIndex === index ? { ...entry, year: Number(event.target.value) } : entry) })} /></label></div><label>Article / award title<input value={item.title} onChange={(event) => update({ entries: page.entries.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry) })} /></label><label>External link<input type="url" value={item.url} onChange={(event) => update({ entries: page.entries.map((entry, itemIndex) => itemIndex === index ? { ...entry, url: event.target.value } : entry) })} /></label></article>)}</div></section><SaveButton save={save} busy={busy} label="Save press page" /></div></>;
}

function CareersEditor({ settings, setSettings, save, busy, media }: { settings: AdminSettings; setSettings: (settings: AdminSettings) => void; save: () => void; busy: boolean; media: MediaAsset[] }) {
  const page = settings.careersPage; const update = (next: Partial<typeof page>) => setSettings({ ...settings, careersPage: { ...page, ...next } });
  return <><PageTitle eyebrow="Pages / Careers" title="Careers" description="Control the careers message, studio image and open roles. Disable a role to hide it without deleting it." /><div className="cms-stack"><section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Page introduction</p><h2>Careers heading</h2></div></div><label>SEO description<textarea value={page.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} /></label><div className="admin-two-col"><label>Emphasised word<input value={page.emphasis} onChange={(event) => update({ emphasis: event.target.value })} /></label><label>Heading after emphasis<input value={page.titleAfter} onChange={(event) => update({ titleAfter: event.target.value })} /></label></div><label>Introduction<textarea value={page.intro} onChange={(event) => update({ intro: event.target.value })} /></label><ImagePicker label="Studio life image" value={page.heroImage} media={media} onChange={(heroImage) => update({ heroImage })} /><div className="admin-two-col"><label>Roles label<input value={page.rolesEyebrow} onChange={(event) => update({ rolesEyebrow: event.target.value })} /></label><label>Roles heading<input value={page.rolesTitle} onChange={(event) => update({ rolesTitle: event.target.value })} /></label></div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Vacancies</p><h2>{page.roles.filter((role) => role.active).length} open roles</h2></div><button type="button" onClick={() => update({ roles: [{ title: "New role", description: "Describe the position.", location: settings.city, experience: "Experience", subject: "Job application", active: false }, ...page.roles] })}>Add role</button></div><div className="cms-collection">{page.roles.map((item, index) => <article className="cms-item" key={index}><div className="cms-item-head"><strong>{item.title}</strong><button type="button" onClick={() => update({ roles: page.roles.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label className="admin-check"><input type="checkbox" checked={item.active} onChange={(event) => update({ roles: page.roles.map((entry, itemIndex) => itemIndex === index ? { ...entry, active: event.target.checked } : entry) })} /> Show this role publicly</label><label>Role title<input value={item.title} onChange={(event) => update({ roles: page.roles.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry) })} /></label><label>Description<textarea value={item.description} onChange={(event) => update({ roles: page.roles.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) })} /></label><div className="admin-two-col"><label>Location / type<input value={item.location} onChange={(event) => update({ roles: page.roles.map((entry, itemIndex) => itemIndex === index ? { ...entry, location: event.target.value } : entry) })} /></label><label>Experience<input value={item.experience} onChange={(event) => update({ roles: page.roles.map((entry, itemIndex) => itemIndex === index ? { ...entry, experience: event.target.value } : entry) })} /></label></div><label>Email subject<input value={item.subject} onChange={(event) => update({ roles: page.roles.map((entry, itemIndex) => itemIndex === index ? { ...entry, subject: event.target.value } : entry) })} /></label></article>)}</div></section>
    <section className="admin-card cms-section"><div className="admin-card-head"><div><p className="admin-kicker">Employer message</p><h2>Why work here</h2></div></div><label>Section label<input value={page.whyEyebrow} onChange={(event) => update({ whyEyebrow: event.target.value })} /></label><label>Heading<input value={page.whyTitle} onChange={(event) => update({ whyTitle: event.target.value })} /></label><label>Description<textarea value={page.whyDescription} onChange={(event) => update({ whyDescription: event.target.value })} /></label></section><SaveButton save={save} busy={busy} label="Save careers page" /></div></>;
}

function MediaLibrary({ media, upload, archive, busy }: { media: MediaAsset[]; upload: (event: FormEvent<HTMLFormElement>) => void; archive: (id: string) => void; busy: boolean }) { return <><PageTitle eyebrow="Content / Media" title="Media library" description="Upload, inspect, and archive the images shared across the public site." /><div className="admin-card upload-card"><div><p className="admin-kicker">Add an asset</p><h2>Upload an image</h2><p>Use this for assets that are not being added to a project yet. Project images can be uploaded directly inside the project editor.</p></div><form onSubmit={upload} className="upload-form"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required /><div className="admin-two-col"><input name="alt" placeholder="Alt text" required /><input name="credit" placeholder="Photographer / rights credit" /></div><button disabled={busy}>{busy ? "Uploading…" : "Upload to library"}</button></form></div><div className="media-grid">{media.filter((asset) => !asset.archived).map((asset) => <article className="media-card" key={asset.id}><div className="media-thumb"><img src={asset.src} alt={asset.alt} /></div><div className="media-meta"><strong>{asset.filename}</strong><span>{asset.width} × {asset.height} · {(asset.size / 1024 / 1024).toFixed(1)} MB</span><small>{asset.alt}</small><button onClick={() => archive(asset.id)}>Archive asset</button></div></article>)}</div></>; }

function Settings({ settings, setSettings, save, busy }: { settings: AdminSettings; setSettings: (settings: AdminSettings) => void; save: () => void; busy: boolean }) {
  const setList = (key: "phones" | "addressLines" | "officeHours", value: string) => setSettings({ ...settings, [key]: value.split("\n").map((line) => line.trim()).filter(Boolean) });
  const contact = settings.contactPage; const updateContact = (next: Partial<typeof contact>) => setSettings({ ...settings, contactPage: { ...contact, ...next } });
  return <><PageTitle eyebrow="Pages / Contact" title="Contact & site" description="Manage the contact page, studio identity, public email, phones, social links, address, opening hours, map and footer." /><div className="admin-card settings-form">
    <div className="admin-section-label">Contact page introduction</div>
    <div className="admin-two-col"><label>Emphasised word<input value={contact.emphasis} onChange={(event) => updateContact({ emphasis: event.target.value })} /></label><label>Heading after emphasis<input value={contact.titleAfter} onChange={(event) => updateContact({ titleAfter: event.target.value })} /></label></div>
    <label>Introduction<textarea value={contact.intro} onChange={(event) => updateContact({ intro: event.target.value })} /></label>
    <div className="admin-section-label">Identity & SEO</div>
    <div className="admin-two-col"><label>Studio name<input value={settings.siteName} onChange={(event) => setSettings({ ...settings, siteName: event.target.value })} /></label><label>Legal name<input value={settings.legalName} onChange={(event) => setSettings({ ...settings, legalName: event.target.value })} /></label></div>
    <label>Site description<textarea value={settings.description} onChange={(event) => setSettings({ ...settings, description: event.target.value })} /></label>
    <div className="admin-two-col"><label>Founding year<input value={settings.foundingYear} onChange={(event) => setSettings({ ...settings, foundingYear: event.target.value })} /></label><label>City<input value={settings.city} onChange={(event) => setSettings({ ...settings, city: event.target.value })} /></label></div>
    <label>Footer headline<input value={settings.footerHeadline} onChange={(event) => setSettings({ ...settings, footerHeadline: event.target.value })} /></label>
    <div className="admin-section-label">Contact & social</div>
    <label>Public contact email<input type="email" value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} /></label>
    <div className="admin-two-col"><label>Phone numbers <small>One per line</small><textarea value={settings.phones.join("\n")} onChange={(event) => setList("phones", event.target.value)} /></label><label>WhatsApp number <small>Country code + number</small><input value={settings.whatsappNumber} onChange={(event) => setSettings({ ...settings, whatsappNumber: event.target.value })} /></label></div>
    <label>Instagram URL<input type="url" value={settings.instagram} onChange={(event) => setSettings({ ...settings, instagram: event.target.value })} /></label>
    <div className="admin-section-label">Address, hours & map</div>
    <label>Studio address <small>One line per address line</small><textarea value={settings.addressLines.join("\n")} onChange={(event) => setList("addressLines", event.target.value)} /></label>
    <div className="admin-two-col"><label>Region / state<input value={settings.region} onChange={(event) => setSettings({ ...settings, region: event.target.value })} /></label><label>Postal code<input value={settings.postalCode} onChange={(event) => setSettings({ ...settings, postalCode: event.target.value })} /></label></div>
    <div className="admin-two-col"><label>Country code<input value={settings.country} onChange={(event) => setSettings({ ...settings, country: event.target.value.toUpperCase() })} /></label><label>Office hours <small>One line per row</small><textarea value={settings.officeHours.join("\n")} onChange={(event) => setList("officeHours", event.target.value)} /></label></div>
    <label>Google Maps search address<input value={settings.mapQuery} onChange={(event) => setSettings({ ...settings, mapQuery: event.target.value })} /></label>
    <div className="admin-two-col"><label>Latitude<input type="number" step="any" value={settings.latitude} onChange={(event) => setSettings({ ...settings, latitude: Number(event.target.value) })} /></label><label>Longitude<input type="number" step="any" value={settings.longitude} onChange={(event) => setSettings({ ...settings, longitude: Number(event.target.value) })} /></label></div>
    <button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save contact & site"}</button>
  </div></>;
}

function Enquiries({ enquiries }: { enquiries: Enquiry[] }) { return <><PageTitle eyebrow="Operations / Inbox" title="Enquiries" description="New contact submissions are stored in SQLite and remain available if email delivery is unavailable." /><div className="admin-card enquiry-list">{enquiries.length === 0 ? <div className="admin-empty"><p>No enquiries yet.</p></div> : enquiries.map((enquiry) => <article key={enquiry.id}><div><strong>{enquiry.name}</strong><span>{enquiry.email} · {enquiry.projectType}</span></div><em className={`status ${enquiry.status}`}>{enquiry.status}</em><p>{enquiry.message}</p><small>{new Date(enquiry.createdAt).toLocaleString()}</small></article>)}</div></>; }
