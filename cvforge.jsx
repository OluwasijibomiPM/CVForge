import React, { useState, useRef } from "react";
import {
  Sparkles, Plus, Trash2, ChevronRight, ChevronLeft, Loader2,
  CheckCircle2, Download, User, Mail, Phone, MapPin, Link as LinkIcon,
  Wand2, Briefcase, GraduationCap, Award, Lock
} from "lucide-react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');`;

const INK = "#16213A";
const PAPER = "#FAF8F3";
const EMBER = "#B8892B";
const EMBER_DARK = "#8F6A20";
const TEAL = "#1F6F5C";
const MUTED = "#6B7280";

const STEPS = ["Basics", "Summary", "Experience", "Education & Skills", "Preview & Pay"];

function newId(counterRef) {
  counterRef.current += 1;
  return "id-" + counterRef.current;
}

async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function Stamp({ visible }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 18,
        right: 24,
        transform: "rotate(-11deg)",
        border: `2.5px solid ${TEAL}`,
        borderRadius: 6,
        padding: "6px 14px",
        color: TEAL,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
        letterSpacing: "0.18em",
        fontSize: 13,
        opacity: 0.85,
        pointerEvents: "none",
      }}
    >
      PAID
      <div style={{ position: "absolute", inset: 3, border: `1px solid ${TEAL}`, borderRadius: 3 }} />
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block mb-4">
      <span className="text-xs font-medium tracking-wide uppercase" style={{ color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
        {label}{required && <span style={{ color: EMBER }}> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-md px-3 py-2.5 text-[15px] bg-white border focus:outline-none focus:ring-2 transition-shadow";
const inputStyle = { borderColor: "#DDD6C7", fontFamily: "'IBM Plex Sans', sans-serif" };

function AIButton({ onClick, loading, label = "Enhance with AI" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-60"
      style={{ background: loading ? "#EFE6D0" : "#F3E9CE", color: EMBER_DARK, fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
      {loading ? "Thinking…" : label}
    </button>
  );
}

export default function App() {
  const idCounter = useRef(0);
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState("NGN");
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");

  const [data, setData] = useState({
    fullName: "", email: "", phone: "", location: "", linkedin: "",
    targetRole: "", industry: "",
    summaryRaw: "", summary: "",
    experiences: [{ id: "exp-0", company: "", role: "", start: "", end: "", isCurrent: false, raw: "", bullets: [] }],
    education: [{ id: "edu-0", institution: "", degree: "", field: "", year: "" }],
    skillsText: "",
    certifications: [],
  });

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [loadingExp, setLoadingExp] = useState({});

  const [isPaid, setIsPaid] = useState(false);
  const [paidSnapshot, setPaidSnapshot] = useState(null);
  const [paying, setPaying] = useState(false);
  const [editCount, setEditCount] = useState(0);

  function set(field, value) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ---------- Experience helpers ----------
  function addExperience() {
    setData((d) => ({
      ...d,
      experiences: [...d.experiences, { id: newId(idCounter), company: "", role: "", start: "", end: "", isCurrent: false, raw: "", bullets: [] }],
    }));
  }
  function removeExperience(id) {
    setData((d) => ({ ...d, experiences: d.experiences.filter((e) => e.id !== id) }));
  }
  function updateExperience(id, patch) {
    setData((d) => ({ ...d, experiences: d.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  async function enhanceExperience(exp) {
    if (!exp.raw.trim()) { showToast("Add a short description first."); return; }
    setLoadingExp((s) => ({ ...s, [exp.id]: true }));
    try {
      const prompt = `You are a professional resume writer optimizing content for ATS (Applicant Tracking Systems) and for a candidate targeting the role of "${data.targetRole || "their target role"}" in the "${data.industry || "their industry"}" industry. Given the raw description below of the candidate's role as "${exp.role || "this role"}" at "${exp.company || "this company"}", rewrite it into 3-5 concise, achievement-oriented bullet points. Start each bullet with a strong action verb. Naturally include relevant keywords for the target role where truthful. Do NOT invent specific numbers, percentages, or achievements not implied by the raw input — describe scope or impact qualitatively if quantification isn't available. Raw input: "${exp.raw}". Respond with ONLY valid JSON, no markdown, no preamble, in this exact format: {"bullets": ["...", "..."]}`;
      const result = await callClaude(prompt);
      updateExperience(exp.id, { bullets: result.bullets || [] });
    } catch (e) {
      showToast("Couldn't reach the AI just now — try again.");
    } finally {
      setLoadingExp((s) => ({ ...s, [exp.id]: false }));
    }
  }

  // ---------- Education / Certifications ----------
  function addEducation() {
    setData((d) => ({ ...d, education: [...d.education, { id: newId(idCounter), institution: "", degree: "", field: "", year: "" }] }));
  }
  function removeEducation(id) {
    setData((d) => ({ ...d, education: d.education.filter((e) => e.id !== id) }));
  }
  function updateEducation(id, patch) {
    setData((d) => ({ ...d, education: d.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }
  function addCertification() {
    setData((d) => ({ ...d, certifications: [...d.certifications, { id: newId(idCounter), name: "", year: "" }] }));
  }
  function removeCertification(id) {
    setData((d) => ({ ...d, certifications: d.certifications.filter((c) => c.id !== id) }));
  }
  function updateCertification(id, patch) {
    setData((d) => ({ ...d, certifications: d.certifications.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }

  // ---------- AI: summary & skills ----------
  async function enhanceSummary() {
    if (!data.summaryRaw.trim()) { showToast("Type at least a few words about yourself first."); return; }
    setLoadingSummary(true);
    try {
      const prompt = `You are a professional resume writer. Given minimal input from a candidate, write a polished, ATS-optimized professional summary (2-3 sentences, under 60 words) tailored to the target role "${data.targetRole || "their target role"}" in the "${data.industry || "their field"}" industry. Use only information reasonably implied by the input — do not invent employers, job titles, years of experience, or numeric metrics that weren't mentioned. Candidate's raw input: "${data.summaryRaw}". Respond with ONLY valid JSON, no markdown, no preamble, in this exact format: {"summary": "..."}`;
      const result = await callClaude(prompt);
      set("summary", result.summary || "");
    } catch (e) {
      showToast("Couldn't reach the AI just now — try again.");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function suggestSkills() {
    setLoadingSkills(true);
    try {
      const existing = data.skillsText.trim();
      const prompt = `Suggest 8-10 relevant, ATS-friendly skills (mix of hard and soft skills) for someone targeting the role of "${data.targetRole || "a professional role"}" in the "${data.industry || "general"}" industry. ${existing ? `They already listed these — do not repeat them: ${existing}.` : ""} Respond with ONLY valid JSON, no markdown, no preamble, in this exact format: {"skills": ["...", "..."]}`;
      const result = await callClaude(prompt);
      const merged = existing ? existing + ", " + (result.skills || []).join(", ") : (result.skills || []).join(", ");
      set("skillsText", merged);
    } catch (e) {
      showToast("Couldn't reach the AI just now — try again.");
    } finally {
      setLoadingSkills(false);
    }
  }

  // ---------- Validation / nav ----------
  function validateStep0() {
    const errs = {};
    if (!data.fullName.trim()) errs.fullName = true;
    if (!data.email.trim()) errs.email = true;
    if (!data.targetRole.trim()) errs.targetRole = true;
    if (!data.industry.trim()) errs.industry = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function next() {
    if (step === 0 && !validateStep0()) { showToast("Fill in the required fields marked *"); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  // ---------- Payment ----------
  const priceNew = currency === "NGN" ? "₦500" : "$5";
  const priceEdit = currency === "NGN" ? "₦100" : "$1";

  function pay() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setIsPaid(true);
      setPaidSnapshot(JSON.stringify(data));
      showToast("Payment successful — resume unlocked.");
    }, 1300);
  }

  const isDirty = isPaid && paidSnapshot !== null && JSON.stringify(data) !== paidSnapshot;

  function saveEdit() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaidSnapshot(JSON.stringify(data));
      setEditCount((c) => c + 1);
      showToast(`Change saved — ${priceEdit} charged.`);
    }, 1000);
  }

  function downloadPdf() {
    window.print();
  }

  const skills = data.skillsText.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: "#EFEBE2", minHeight: "100%" }}>
      <style>{`
        ${FONT_IMPORT}
        .cvf-serif { font-family: 'Fraunces', serif; }
        input:focus, textarea:focus { box-shadow: 0 0 0 2px ${EMBER}33; border-color: ${EMBER}; }
        @media print {
          body * { visibility: hidden; }
          .cvf-printable, .cvf-printable * { visibility: visible; }
          .cvf-printable { position: absolute; top: 0; left: 0; width: 100%; margin: 0; box-shadow: none !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-5 py-8 no-print">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="cvf-serif text-2xl font-semibold" style={{ color: INK }}>CVForge</h1>
            <p className="text-xs mt-0.5" style={{ color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>build a resume worth reading</p>
          </div>
          <div className="flex items-center gap-1 text-xs rounded-full p-1" style={{ background: "#E3DCC9" }}>
            {["NGN", "USD"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className="px-3 py-1.5 rounded-full font-medium transition-colors"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: currency === c ? INK : "transparent",
                  color: currency === c ? PAPER : MUTED,
                }}
              >
                {c === "NGN" ? "₦ Nigeria" : "$ International"}
              </button>
            ))}
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: i <= step ? EMBER : "#E3DCC9",
                    color: i <= step ? PAPER : MUTED,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className="text-[10px] mt-1 text-center" style={{ color: i === step ? INK : MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px mx-1" style={{ background: i < step ? EMBER : "#D9D1BC" }} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Form panel */}
          <div className="rounded-xl p-6" style={{ background: "white", border: "1px solid #E3DCC9" }}>
            {step === 0 && (
              <div>
                <h2 className="cvf-serif text-lg font-semibold mb-4" style={{ color: INK }}>Your basics</h2>
                <Field label="Full name" required>
                  <input className={inputCls} style={{ ...inputStyle, borderColor: errors.fullName ? "#C0392B" : inputStyle.borderColor }} value={data.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Ada Obi" />
                </Field>
                <Field label="Email" required>
                  <input className={inputCls} style={{ ...inputStyle, borderColor: errors.email ? "#C0392B" : inputStyle.borderColor }} value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="ada@email.com" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone"><input className={inputCls} style={inputStyle} value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234 801 234 5678" /></Field>
                  <Field label="Location"><input className={inputCls} style={inputStyle} value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="Lagos, Nigeria" /></Field>
                </div>
                <Field label="LinkedIn / Portfolio"><input className={inputCls} style={inputStyle} value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/ada" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Target job title" required>
                    <input className={inputCls} style={{ ...inputStyle, borderColor: errors.targetRole ? "#C0392B" : inputStyle.borderColor }} value={data.targetRole} onChange={(e) => set("targetRole", e.target.value)} placeholder="Product Manager" />
                  </Field>
                  <Field label="Industry" required>
                    <input className={inputCls} style={{ ...inputStyle, borderColor: errors.industry ? "#C0392B" : inputStyle.borderColor }} value={data.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Fintech" />
                  </Field>
                </div>
                <p className="text-xs mt-2" style={{ color: MUTED }}>Your target role and industry steer every AI suggestion below — take a moment to get these right.</p>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="cvf-serif text-lg font-semibold mb-4" style={{ color: INK }}>Professional summary</h2>
                <Field label="Tell us a little about yourself — even a fragment is fine">
                  <textarea className={inputCls} style={inputStyle} rows={3} value={data.summaryRaw} onChange={(e) => set("summaryRaw", e.target.value)} placeholder="e.g. final year accounting student, did a 3-month internship at a bank, good with Excel" />
                </Field>
                <AIButton onClick={enhanceSummary} loading={loadingSummary} label="Write my summary" />
                {data.summary && (
                  <Field label="Polished summary — feel free to edit">
                    <textarea className={inputCls} style={inputStyle} rows={4} value={data.summary} onChange={(e) => set("summary", e.target.value)} />
                  </Field>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="cvf-serif text-lg font-semibold mb-4" style={{ color: INK }}>Work experience</h2>
                {data.experiences.map((exp, i) => (
                  <div key={exp.id} className="mb-5 pb-5" style={{ borderBottom: i < data.experiences.length - 1 ? "1px dashed #E3DCC9" : "none" }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium" style={{ color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>Role {i + 1}</span>
                      {data.experiences.length > 1 && (
                        <button onClick={() => removeExperience(exp.id)} className="text-xs flex items-center gap-1" style={{ color: "#C0392B" }}><Trash2 size={12} /> remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Company"><input className={inputCls} style={inputStyle} value={exp.company} onChange={(e) => updateExperience(exp.id, { company: e.target.value })} placeholder="Zenith Bank" /></Field>
                      <Field label="Job title"><input className={inputCls} style={inputStyle} value={exp.role} onChange={(e) => updateExperience(exp.id, { role: e.target.value })} placeholder="Customer Service Rep" /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Start"><input className={inputCls} style={inputStyle} value={exp.start} onChange={(e) => updateExperience(exp.id, { start: e.target.value })} placeholder="Jan 2023" /></Field>
                      <Field label={exp.isCurrent ? "End" : "End (or 'Present')"}>
                        <input className={inputCls} style={inputStyle} value={exp.isCurrent ? "Present" : exp.end} disabled={exp.isCurrent} onChange={(e) => updateExperience(exp.id, { end: e.target.value })} placeholder="Dec 2023" />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-xs mb-3" style={{ color: MUTED }}>
                      <input type="checkbox" checked={exp.isCurrent} onChange={(e) => updateExperience(exp.id, { isCurrent: e.target.checked })} /> I currently work here
                    </label>
                    <Field label="What did you actually do? A rough note is fine">
                      <textarea className={inputCls} style={inputStyle} rows={2} value={exp.raw} onChange={(e) => updateExperience(exp.id, { raw: e.target.value })} placeholder="e.g. answered customer calls, resolved complaints, helped open new accounts" />
                    </Field>
                    <AIButton onClick={() => enhanceExperience(exp)} loading={!!loadingExp[exp.id]} label="Turn into resume bullets" />
                    {exp.bullets.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {exp.bullets.map((b, bi) => (
                          <li key={bi}>
                            <input
                              className="w-full text-sm px-2 py-1 rounded border-none bg-transparent"
                              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                              value={b}
                              onChange={(e) => {
                                const nb = [...exp.bullets]; nb[bi] = e.target.value;
                                updateExperience(exp.id, { bullets: nb });
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                <button onClick={addExperience} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: EMBER_DARK }}>
                  <Plus size={15} /> Add another role
                </button>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="cvf-serif text-lg font-semibold mb-3" style={{ color: INK }}>Education</h2>
                {data.education.map((edu, i) => (
                  <div key={edu.id} className="mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Institution"><input className={inputCls} style={inputStyle} value={edu.institution} onChange={(e) => updateEducation(edu.id, { institution: e.target.value })} placeholder="University of Lagos" /></Field>
                      <Field label="Degree"><input className={inputCls} style={inputStyle} value={edu.degree} onChange={(e) => updateEducation(edu.id, { degree: e.target.value })} placeholder="B.Sc" /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <Field label="Field of study"><input className={inputCls} style={inputStyle} value={edu.field} onChange={(e) => updateEducation(edu.id, { field: e.target.value })} placeholder="Economics" /></Field>
                      <div className="flex gap-2">
                        <div className="flex-1"><Field label="Year"><input className={inputCls} style={inputStyle} value={edu.year} onChange={(e) => updateEducation(edu.id, { year: e.target.value })} placeholder="2022" /></Field></div>
                        {data.education.length > 1 && <button onClick={() => removeEducation(edu.id)} className="mb-4 text-xs" style={{ color: "#C0392B" }}><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addEducation} className="flex items-center gap-1.5 text-sm font-medium mb-6" style={{ color: EMBER_DARK }}><Plus size={15} /> Add education</button>

                <h2 className="cvf-serif text-lg font-semibold mb-3" style={{ color: INK }}>Skills</h2>
                <Field label="Comma-separated skills">
                  <textarea className={inputCls} style={inputStyle} rows={2} value={data.skillsText} onChange={(e) => set("skillsText", e.target.value)} placeholder="Excel, customer service, teamwork" />
                </Field>
                <AIButton onClick={suggestSkills} loading={loadingSkills} label="Suggest skills for this role" />

                <h2 className="cvf-serif text-lg font-semibold mt-6 mb-3" style={{ color: INK }}>Certifications (optional)</h2>
                {data.certifications.map((c) => (
                  <div key={c.id} className="flex gap-2 mb-2">
                    <input className={inputCls} style={inputStyle} value={c.name} onChange={(e) => updateCertification(c.id, { name: e.target.value })} placeholder="Google Data Analytics" />
                    <input className={inputCls} style={{ ...inputStyle, maxWidth: 90 }} value={c.year} onChange={(e) => updateCertification(c.id, { year: e.target.value })} placeholder="2024" />
                    <button onClick={() => removeCertification(c.id)} style={{ color: "#C0392B" }}><Trash2 size={16} /></button>
                  </div>
                ))}
                <button onClick={addCertification} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: EMBER_DARK }}><Plus size={15} /> Add certification</button>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="cvf-serif text-lg font-semibold mb-3" style={{ color: INK }}>Checkout</h2>
                {!isPaid ? (
                  <>
                    <p className="text-sm mb-4" style={{ color: MUTED }}>Your resume is ready to preview on the right. Unlock the polished, downloadable version:</p>
                    <div className="rounded-lg p-4 mb-4" style={{ background: "#F5F0E4", border: "1px solid #E3DCC9" }}>
                      <div className="flex justify-between text-sm mb-1"><span>New resume</span><span className="font-semibold">{priceNew}</span></div>
                      <p className="text-xs" style={{ color: MUTED }}>One-time fee. Unlocks download &amp; print.</p>
                    </div>
                    <button onClick={pay} disabled={paying} className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-70" style={{ background: INK, color: PAPER }}>
                      {paying ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>Pay {priceNew}</>}
                    </button>
                    <p className="text-[11px] mt-3" style={{ color: MUTED }}>
                      Demo checkout — no real charge occurs here. In production this connects to Paystack for ₦ payments and Stripe for $ payments via a backend.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4 text-sm font-medium" style={{ color: TEAL }}>
                      <CheckCircle2 size={16} /> Resume unlocked
                    </div>
                    {isDirty && (
                      <div className="rounded-lg p-4 mb-4" style={{ background: "#FBF0E4", border: "1px solid #E9CFA0" }}>
                        <p className="text-sm mb-2">You've made changes since your last save.</p>
                        <button onClick={saveEdit} disabled={paying} className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2" style={{ background: EMBER, color: "white" }}>
                          {paying ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <>Save changes — {priceEdit}</>}
                        </button>
                      </div>
                    )}
                    <button onClick={downloadPdf} className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: INK, color: PAPER }}>
                      <Download size={16} /> Download / Print PDF
                    </button>
                    {editCount > 0 && <p className="text-xs mt-3" style={{ color: MUTED }}>{editCount} paid edit{editCount > 1 ? "s" : ""} so far · {priceEdit} each</p>}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={back} disabled={step === 0} className="flex items-center gap-1 text-sm font-medium disabled:opacity-30" style={{ color: INK }}><ChevronLeft size={16} /> Back</button>
              {step < STEPS.length - 1 && (
                <button onClick={next} className="flex items-center gap-1 text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: EMBER, color: "white" }}>
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div>
            <div className="cvf-printable relative rounded-xl p-8 shadow-sm" style={{ background: PAPER, border: "1px solid #E3DCC9", minHeight: 420 }}>
              <Stamp visible={isPaid} />
              <h2 className="cvf-serif text-2xl font-bold" style={{ color: INK }}>{data.fullName || "Your Name"}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1.5" style={{ color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>
                {data.email && <span className="flex items-center gap-1"><Mail size={11} />{data.email}</span>}
                {data.phone && <span className="flex items-center gap-1"><Phone size={11} />{data.phone}</span>}
                {data.location && <span className="flex items-center gap-1"><MapPin size={11} />{data.location}</span>}
                {data.linkedin && <span className="flex items-center gap-1"><LinkIcon size={11} />{data.linkedin}</span>}
              </div>

              {data.summary && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: EMBER_DARK }}>Summary</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#2B2B2B" }}>{data.summary}</p>
                </div>
              )}

              {data.experiences.some((e) => e.company || e.role) && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1.5" style={{ color: EMBER_DARK }}><Briefcase size={12} /> Experience</h3>
                  {data.experiences.filter((e) => e.company || e.role).map((exp) => (
                    <div key={exp.id} className="mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold" style={{ color: INK }}>{exp.role || "Role"}{exp.company && `, ${exp.company}`}</span>
                        <span className="text-xs" style={{ color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{exp.start}{(exp.start || exp.end) && " – "}{exp.isCurrent ? "Present" : exp.end}</span>
                      </div>
                      {exp.bullets.length > 0 ? (
                        <ul className="list-disc list-inside text-sm mt-1 space-y-0.5" style={{ color: "#2B2B2B" }}>
                          {exp.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                        </ul>
                      ) : exp.raw ? (
                        <p className="text-sm mt-1" style={{ color: "#2B2B2B" }}>{exp.raw}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {data.education.some((e) => e.institution || e.degree) && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1.5" style={{ color: EMBER_DARK }}><GraduationCap size={12} /> Education</h3>
                  {data.education.filter((e) => e.institution || e.degree).map((edu) => (
                    <div key={edu.id} className="flex justify-between text-sm mb-0.5">
                      <span style={{ color: "#2B2B2B" }}>{edu.degree}{edu.field && ` in ${edu.field}`}{edu.institution && `, ${edu.institution}`}</span>
                      <span className="text-xs" style={{ color: MUTED, fontFamily: "'IBM Plex Mono', monospace" }}>{edu.year}</span>
                    </div>
                  ))}
                </div>
              )}

              {skills.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: EMBER_DARK }}>Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#EFE6D0", color: EMBER_DARK }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {data.certifications.some((c) => c.name) && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1.5" style={{ color: EMBER_DARK }}><Award size={12} /> Certifications</h3>
                  {data.certifications.filter((c) => c.name).map((c) => (
                    <div key={c.id} className="flex justify-between text-sm"><span>{c.name}</span><span className="text-xs" style={{ color: MUTED }}>{c.year}</span></div>
                  ))}
                </div>
              )}

              {!isPaid && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] px-2 py-1 rounded-full no-print" style={{ background: "#F5F0E4", color: MUTED }}>
                  <Lock size={10} /> preview
                </div>
              )}
            </div>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg no-print" style={{ background: INK, color: PAPER }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
