"use client";

import { useState } from "react";

const PROJECT_TYPES = [
  "Architecture",
  "Interior",
  "Landscape",
  "Planning",
] as const;

interface ContactFormState {
  name: string;
  email: string;
  projectType: string;
  location: string;
  message: string;
  website: string;
}

const INITIAL_STATE: ContactFormState = {
  name: "",
  email: "",
  projectType: PROJECT_TYPES[0],
  location: "",
  message: "",
  website: "",
};

/**
 * /contact — interactive enquiry form. Client island with controlled inputs.
 * There is no backend: on submit, compose the enquiry in the visitor's email
 * client and provide a direct fallback link if the mail client does not open.
 */
export function ContactForm() {
  const [values, setValues] = useState<ContactFormState>(INITIAL_STATE);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const updateField =
    (field: keyof ContactFormState) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { value } = event.target;
      setValues((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true); setStatus(null);
    const response = await fetch("/api/contact", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(values) });
    const result = await response.json();
    setSending(false);
    setStatus(response.ok ? "Thanks — your enquiry has been received. We’ll be in touch within a few working days." : (result.error ?? "We couldn’t send that. Please try again."));
    if(response.ok) setValues(INITIAL_STATE);
  };

  return (
    <form id="inquiry-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="contact-name">Your name</label>
        <input
          id="contact-name"
          type="text"
          required
          placeholder="Ana Salvi"
          value={values.name}
          onChange={updateField("name")}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          required
          placeholder="ana@studio.in"
          value={values.email}
          onChange={updateField("email")}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-project-type">Project type</label>
        <select
          id="contact-project-type"
          value={values.projectType}
          onChange={updateField("projectType")}
        >
          {PROJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="contact-location">Site location</label>
        <input
          id="contact-location"
          type="text"
          placeholder="City, state"
          value={values.location}
          onChange={updateField("location")}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message">Tell us about it</label>
        <textarea
          id="contact-message"
          rows={4}
          placeholder="A paragraph or two."
          value={values.message}
          onChange={updateField("message")}
        />
      </div>
      <div className="field" style={{ display: "none" }} aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={updateField("website")} /></div>
      <button
        type="submit"
        className="btn-red contact-submit"
        disabled={sending}
      >
        {sending ? "Sending…" : "Send enquiry →"}
      </button>
      {status && <div id="mailto-status" role="status" className="mailto-status">{status}</div>}
    </form>
  );
}
