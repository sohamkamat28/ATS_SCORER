"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft, ArrowRight, Award, BarChart3, BookOpen, Check,
  Clock3, Download, FileSearch, History, Home, Lightbulb, LoaderCircle,
  LogIn, LogOut, Menu, Trash2, UploadCloud, X,
} from "lucide-react";
import { analyzeResume, deleteHistory, downloadReport, getHistory, type Analysis } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";

type View = "home" | "analyzer" | "history" | "resources" | "auth";
type HistoryItem = { id: string | number; filename: string; ats_score: number; created_at: string; analysis_result: Analysis };

const navigation = [
  { id: "home" as View, label: "Home", icon: Home },
  { id: "analyzer" as View, label: "Analyzer", icon: BarChart3, protected: true },
  { id: "history" as View, label: "History", icon: History, protected: true },
  { id: "resources" as View, label: "Resources", icon: BookOpen },
];

export function ResumeLensApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("home");
  const [returnView, setReturnView] = useState<View>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function navigate(next: View, needsAuth = false) {
    if (needsAuth && !session) {
      setReturnView(next);
      setView("auth");
    } else setView(next);
    setMobileNav(false);
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    setView("home");
  }

  if (!authReady) return <div className="app-loader"><LoaderCircle className="spin" /> Loading workspace</div>;

  return (
    <div className="app-frame">
      <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button>
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button>
        <div className="brand"><span className="brand-mark">RL</span><span><strong>ResumeLens</strong><small>ATS dashboard</small></span></div>
        <p className="nav-label">Workspace</p>
        <nav>
          {navigation.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id, item.protected)}><item.icon /><span>{item.label}</span></button>)}
        </nav>
        <div className="workspace-note"><span /><small>Analysis engine</small><strong>Groq and Supabase connected</strong></div>
      </aside>
      {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <main>
        {view === "home" && <HomeView session={session} onAnalyze={() => navigate("analyzer", true)} onAuth={() => { setReturnView("home"); setView("auth"); }} onSignOut={signOut} />}
        {view === "auth" && <AuthView onBack={() => setView("home")} onSuccess={() => setView(returnView)} />}
        {view === "analyzer" && session && <AnalyzerView token={session.access_token} />}
        {view === "history" && session && <HistoryView token={session.access_token} onAnalyze={() => setView("analyzer")} />}
        {view === "resources" && <ResourcesView onAnalyze={() => navigate("analyzer", true)} />}
      </main>
    </div>
  );
}

function HomeView({ session, onAnalyze, onAuth, onSignOut }: { session: Session | null; onAnalyze: () => void; onAuth: () => void; onSignOut: () => void }) {
  return <>
    <header className="account-bar"><div><span>{session ? "Signed in" : "Your workspace"}</span><strong>{session?.user.email || "Sign in to save reports and history"}</strong></div><button className={session ? "button secondary" : "button primary"} onClick={session ? onSignOut : onAuth}>{session ? <LogOut /> : <LogIn />}{session ? "Sign out" : "Sign in"}</button></header>
    <section className="hero"><p className="breadcrumb">ResumeLens / ATS resume analyzer</p><h1>The resume analyzer that turns applications into interviews</h1><p className="hero-copy">Upload a resume, compare it against a role, and get an evidence-based report for ATS fit, keywords, structure, and skill proof.</p><button className="button primary hero-cta" onClick={onAnalyze}>Analyze my resume <ArrowRight /></button></section>
    <section className="preview-stage">
      <article className="builder-card"><div className="saved"><span /> Analysis ready</div><div className="steps"><i>1</i><i className="active">2</i><i>3</i><i>4</i></div><h2>Tell us what role you want</h2><p>ResumeLens compares your resume against the job description and highlights the gaps that matter.</p><div className="preview-fields"><div><small>Target role</small><strong>Product analyst</strong></div><div><small>Seniority</small><strong>Mid level</strong></div></div><div className="chips"><span>SQL</span><span>Experimentation</span><span>Dashboards</span></div></article>
      <article className="report-card"><div className="report-title"><span>ATS report</span><small>Live preview</small></div><div className="resume-sheet"><span className="scan-line" /><strong>Maya Shah</strong><small>Product analyst</small><i /><i /><i /></div><div className="loop-result"><div><small>ATS score</small><strong>84</strong><p>Strong structure with role-ready experience.</p></div><div><small>Keyword coverage</small><strong>76%</strong><p>Add analytics, funnel, and cohort language.</p></div><div><small>Next action</small><strong>3 fixes</strong><p>Add metrics, mirror title language, tighten bullets.</p></div></div></article>
    </section>
    <section className="proof-row"><article><span>01</span><h3>Parse cleanly</h3><p>Checks sections, links, formatting, and ATS-readable structure.</p></article><article><span>02</span><h3>Match the role</h3><p>Compares required skills, language, and missing terms.</p></article><article><span>03</span><h3>Export the report</h3><p>Downloads a polished report for review and action.</p></article></section>
  </>;
}

function AuthView({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const auth = getSupabase().auth;
    const result = mode === "signin" ? await auth.signInWithPassword({ email, password }) : await auth.signUp({ email, password });
    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    if (result.data.session) onSuccess(); else setMessage("Check your inbox to confirm your account.");
  }
  async function google() { await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }); }
  return <section className="auth-page"><button className="back-link" onClick={onBack}><ArrowLeft /> Back to home</button><div className="auth-intro"><span className="auth-mark">RL</span><p className="eyebrow">ResumeLens account</p><h1>Sign in to continue</h1><p>Your reports and analysis history stay connected to your account.</p></div><div className="auth-card"><div className="tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button></div><form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label><label>Password<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>{message && <p className="form-message">{message}</p>}<button className="button primary full" disabled={busy}>{busy && <LoaderCircle className="spin" />}{mode === "signin" ? "Sign in" : "Create account"}</button></form><div className="divider"><span>or</span></div><button className="button secondary full" onClick={google}>Continue with Google</button></div></section>;
}

function AnalyzerView({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null); const [jd, setJd] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function run() { if (!file) return; setBusy(true); setError(""); try { setAnalysis(await analyzeResume(file, jd, token)); } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); } finally { setBusy(false); } }
  async function download() { if (!analysis) return; const blob = await downloadReport(analysis, token); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "ats-resume-report.pdf"; a.click(); URL.revokeObjectURL(url); }
  return <section className="page"><PageHeading eyebrow="Analyzer" title="Resume scoring workspace" copy="Upload a resume, add role context when available, and review a structured ATS readiness report." /><div className="analyzer-grid"><article className="upload-panel"><label className={`dropzone ${file ? "has-file" : ""}`}><UploadCloud /><strong>{file ? file.name : "Choose your resume"}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF or DOCX, up to 5 MB"}</span><input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><label className="field-label">Job description <span>Optional</span><textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the role description for targeted matching..." /></label>{error && <p className="error-box">{error}</p>}<button className="button primary full" disabled={!file || busy} onClick={run}>{busy ? <><LoaderCircle className="spin" /> Analyzing resume</> : <><FileSearch /> Analyze resume</>}</button></article><aside className="analysis-guide"><p className="eyebrow">What gets checked</p><h2>A focused review across five signals.</h2>{["ATS-readable formatting", "Role and keyword coverage", "Evidence-backed skills", "Content quality and metrics", "Recruiter-ready recommendations"].map((x) => <p key={x}><Check /> {x}</p>)}</aside></div>{analysis && <Results analysis={analysis} onDownload={download} />}</section>;
}

function Results({ analysis, onDownload }: { analysis: Analysis; onDownload: () => void }) {
  const score = Math.round(analysis.ATS_score ?? analysis.ats_score);
  const labels: Record<string, string> = { formatting: "Formatting", keywords: "Keywords", content: "Content", skill_validation: "Skill validation", ats_compatibility: "ATS compatibility" };
  const descriptions: Record<string, string> = { formatting: "Structure, sections, and readable layout", keywords: "Role language and relevant terminology", content: "Action verbs, outcomes, and measurable work", skill_validation: "Skills supported by project or work evidence", ats_compatibility: "Parsing safety and conventional formatting" };
  const max: Record<string, number> = { formatting: 20, keywords: 25, content: 25, skill_validation: 15, ats_compatibility: 15 };
  const validation = analysis.skill_validation_details;
  const strengths = analysis.strengths?.length ? analysis.strengths : deriveStrengths(analysis.component_scores, labels, max);
  const issues = analysis.detailed_feedback || [];
  const priorityCounts = issues.reduce<Record<string, number>>((counts, issue) => {
    const severity = issue.severity_level?.toLowerCase() || "low";
    counts[severity] = (counts[severity] || 0) + 1;
    return counts;
  }, {});

  return <section className="results report-results">
    <header className="report-overview">
      <div className="report-score">
        <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><span><strong>{score}</strong><small>out of 100</small></span></div>
      </div>
      <div className="report-summary-copy">
        <p className="report-kicker">ATS readiness report</p>
        <h2>{score >= 80 ? "Strong foundation" : score >= 60 ? "Competitive with focused edits" : "Needs focused revision"}</h2>
        <p>{analysis.interpretation || "Work through the recommendations in priority order, then run another scan before applying."}</p>
        <div className="report-facts">
          <span><strong>{issues.length}</strong> recommendations</span>
          <span><strong>{validation?.validated_count || 0}</strong> validated skills</span>
          {analysis.jd_match_analysis && <span><strong>{Math.round(analysis.jd_match_analysis.match_percentage)}%</strong> role match</span>}
        </div>
      </div>
      <button className="button report-download" onClick={onDownload}><Download /> Download full report</button>
    </header>

    <section className="report-section score-section-web">
      <ReportSectionHeading index="01" title="Score breakdown" copy="How each part of the resume contributes to the overall score." />
      <div className="score-breakdown-list">
        {Object.entries(analysis.component_scores).map(([key, value]) => {
          const percentage = Math.min(100, value / (max[key] || 100) * 100);
          return <article key={key}>
            <div><strong>{labels[key] || key}</strong><span>{descriptions[key]}</span></div>
            <div className="score-track"><i style={{ width: `${percentage}%` }} /></div>
            <b>{Math.round(value)}<small>/{max[key] || 100}</small></b>
          </article>;
        })}
      </div>
    </section>

    <div className="report-columns">
      <section className="report-section strengths-section">
        <ReportSectionHeading index="02" title="What is working" copy="Signals already helping your resume." />
        <div className="strength-list">
          {strengths.map((item) => <p key={item}><span><Check /></span>{item}</p>)}
        </div>
      </section>

      <section className="report-section skill-section">
        <ReportSectionHeading index="03" title="Skill evidence" copy="Claims cross-checked against projects and experience." />
        <div className="skill-stats">
          <div><strong>{validation?.total || analysis.skills?.length || 0}</strong><span>Total skills</span></div>
          <div><strong>{validation?.validated_count || 0}</strong><span>Validated</span></div>
          <div><strong>{validation?.unvalidated?.length || 0}</strong><span>Need evidence</span></div>
        </div>
        {!!validation?.validated?.length && <div className="evidence-list">
          {validation.validated.slice(0, 8).map((item) => <div key={item.skill}><strong>{item.skill}</strong><span>{item.projects?.length ? item.projects.join(" · ") : "Evidence found in resume"}</span></div>)}
        </div>}
        {!!validation?.unvalidated?.length && <KeywordGroup title="Skills that need supporting context" values={validation.unvalidated} />}
      </section>
    </div>

    {analysis.jd_match_analysis && <section className="report-section role-section">
      <ReportSectionHeading index="04" title="Role match" copy="Language and capabilities compared with the supplied job description." />
      <div className="role-layout">
        <div className="match-score"><span>Overall match</span><strong>{Math.round(analysis.jd_match_analysis.match_percentage)}%</strong><small>{Math.round(analysis.jd_match_analysis.semantic_similarity * 100)}% semantic similarity</small></div>
        <KeywordGroup title="Matched keywords" values={analysis.jd_match_analysis.matched_keywords} positive />
        <KeywordGroup title="Missing keywords" values={analysis.jd_match_analysis.missing_keywords} />
      </div>
      {!!analysis.jd_match_analysis.skills_gap.length && <KeywordGroup title="Skills gap" values={analysis.jd_match_analysis.skills_gap} warning />}
    </section>}

    <section className="report-section recommendations-section">
      <div className="recommendations-heading">
        <ReportSectionHeading index={analysis.jd_match_analysis ? "05" : "04"} title="Recommendations" copy="Every detected issue, ordered by practical impact." />
        <div className="priority-summary">
          <span className="severity high">{priorityCounts.high || 0} high</span>
          <span className="severity moderate">{(priorityCounts.moderate || 0) + (priorityCounts.medium || 0)} medium</span>
          <span className="severity low">{(priorityCounts.low || 0) + (priorityCounts.info || 0)} low</span>
        </div>
      </div>
      {issues.length ? <div className="recommendation-list">{issues.map((issue, index) => <article className={`recommendation-card severity-${issue.severity_level?.toLowerCase() || "low"}`} key={`${issue.issue_title}-${index}`}>
        <header><span className={`severity ${severityClass(issue.severity_level)}`}>{issue.severity_level || "Low"}</span><div><small>Recommendation {String(index + 1).padStart(2, "0")}</small><h3>{issue.issue_title}</h3></div></header>
        <p className="issue-explanation">{issue.explanation}</p>
        <dl>
          {issue.ats_impact && <div><dt>ATS impact</dt><dd>{issue.ats_impact}</dd></div>}
          {issue.where_it_appears && <div><dt>Where it appears</dt><dd>{issue.where_it_appears}</dd></div>}
        </dl>
        <div className="fix-panel"><Lightbulb /><div><strong>How to fix it</strong><p>{issue.how_to_fix}</p></div></div>
        {!!issue.action_items?.length && <div className="action-checklist"><strong>Action checklist</strong>{issue.action_items.map((item) => <p key={item}><span />{item}</p>)}</div>}
        {issue.example_improvement && <div className="example-panel"><strong>Example improvement</strong><p>{issue.example_improvement}</p></div>}
      </article>)}</div> : <div className="report-empty"><Award /><div><strong>No major issues detected</strong><p>Keep the resume tailored to each role and rescan after meaningful edits.</p></div></div>}
    </section>
  </section>;
}

function ReportSectionHeading({ index, title, copy }: { index: string; title: string; copy: string }) { return <header className="report-section-heading"><span>{index}</span><div><h2>{title}</h2><p>{copy}</p></div></header>; }

function deriveStrengths(scores: Record<string, number>, labels: Record<string, string>, maximums: Record<string, number>) { return Object.entries(scores).filter(([key, value]) => value / (maximums[key] || 100) >= .72).map(([key]) => `${labels[key] || key} is performing above the target benchmark`); }

function severityClass(value: string) { const severity = value?.toLowerCase(); return severity === "high" ? "high" : severity === "moderate" || severity === "medium" ? "moderate" : "low"; }

function KeywordGroup({ title, values, positive = false, warning = false }: { title: string; values: string[]; positive?: boolean; warning?: boolean }) { return <div className="keyword-group"><span>{title}</span><div>{values.map((x) => <i className={positive ? "positive" : warning ? "warning" : ""} key={x}>{x}</i>)}</div></div>; }

function HistoryView({ token, onAnalyze }: { token: string; onAnalyze: () => void }) {
  const [items, setItems] = useState<HistoryItem[]>([]); const [busy, setBusy] = useState(true); const [error, setError] = useState("");
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  useEffect(() => {
    let active = true;
    getHistory(token)
      .then((history) => { if (active) setItems(history); })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Could not load history"); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [token]);
  async function remove(id: string | number) { await deleteHistory(String(id), token); setItems((old) => old.filter((x) => x.id !== id)); }
  async function downloadSelected() { if (!selected) return; const blob = await downloadReport(selected.analysis_result, token); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${selected.filename.replace(/\.[^.]+$/, "")}-ats-report.pdf`; a.click(); URL.revokeObjectURL(url); }
  if (selected) return <section className="page history-report"><button className="back-link" onClick={() => setSelected(null)}><ArrowLeft /> Back to history</button><PageHeading eyebrow="Saved report" title={selected.filename} copy={`Analyzed ${new Date(selected.created_at).toLocaleDateString(undefined, { dateStyle: "long" })}`} /><Results analysis={selected.analysis_result} onDownload={downloadSelected} /></section>;
  return <section className="page"><PageHeading eyebrow="History" title="Previous resume analyses" copy="Review completed scans, compare score movement, and remove outdated reports." />{busy ? <div className="empty-state"><LoaderCircle className="spin" /> Loading reports</div> : error ? <p className="error-box">{error}</p> : items.length === 0 ? <div className="empty-state"><Clock3 /><h2>No reports yet</h2><p>Your completed resume analyses will appear here.</p><button className="button primary" onClick={onAnalyze}>Open analyzer</button></div> : <div className="history-list">{items.map((item) => <article key={item.id}><div className="file-icon"><FileSearch /></div><div><strong>{item.filename}</strong><span>{new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</span></div><div className="history-score"><strong>{Math.round(item.ats_score)}</strong><span>ATS score</span></div><button className="button history-view" onClick={() => setSelected(item)}>View report</button><button className="icon-button" onClick={() => remove(item.id)} aria-label={`Delete ${item.filename}`}><Trash2 /></button></article>)}</div>}</section>;
}

function ResourcesView({ onAnalyze }: { onAnalyze: () => void }) { const resources = [{ title: "ATS formatting checklist", text: "Use conventional headings, simple columns, and selectable text." }, { title: "Keyword matching guide", text: "Mirror role language naturally and prioritize recurring requirements." }, { title: "Evidence-first bullets", text: "Pair actions with scope, outcome, and a credible metric." }, { title: "Before you submit", text: "Check links, file naming, dates, and role-specific terminology." }]; return <section className="page"><PageHeading eyebrow="Resources" title="Build a resume that reads clearly" copy="Practical guidance for stronger ATS parsing and more convincing recruiter review." /><div className="resource-grid">{resources.map((x, i) => <article key={x.title}><span>0{i + 1}</span><h2>{x.title}</h2><p>{x.text}</p></article>)}</div><button className="button primary resource-cta" onClick={onAnalyze}>Analyze your resume <ArrowRight /></button></section>; }

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <header className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header>; }
