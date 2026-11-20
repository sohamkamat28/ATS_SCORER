"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, FileCheck2, FileText,
  Layers3, LoaderCircle, LogOut, Menu, ScanLine, X,
} from "lucide-react";
import { AnalyzerView, HistoryView, ResourcesView } from "./workspace-views";
import { getSupabase } from "@/lib/supabase";

type View = "home" | "analyzer" | "history" | "resources" | "auth";

const navigation: Array<{ id: View; label: string; protected?: boolean }> = [
  { id: "home", label: "Overview" },
  { id: "analyzer", label: "Analyzer", protected: true },
  { id: "history", label: "History", protected: true },
  { id: "resources", label: "Resources" },
];

function LensMark({ className = "" }: { className?: string }) {
  return <svg className={`lens-mark ${className}`} viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 18V5h13M11 23h13V10" stroke="currentColor" strokeWidth="1.5" /><path d="m5 23 18-18M8 23 23 8M5 20 20 5" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

export function ResumeLensApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>("home");
  const [returnView, setReturnView] = useState<View>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const startupTimeout = window.setTimeout(() => {
      if (active) {
        setAuthError("Account access is taking longer than expected. Please try signing in again.");
        setAuthReady(true);
      }
    }, 20000);
    async function initializeAuth() {
      try {
        const supabase = getSupabase();
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (active) {
            setSession(nextSession);
            setAuthReady(true);
            if (nextSession) setAuthError("");
          }
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const result = await supabase.auth.getSession();
        if (result.error) throw result.error;
        if (active) { setSession(result.data.session); setAuthError(""); }
      } catch (error) {
        if (active) setAuthError(error instanceof Error ? error.message : "Could not load your account. Please try signing in again.");
      } finally {
        window.clearTimeout(startupTimeout);
        if (active) setAuthReady(true);
      }
    }
    void initializeAuth();
    return () => { active = false; window.clearTimeout(startupTimeout); unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!mobileNav) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setMobileNav(false); menuButton.current?.focus(); }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileNav]);

  function navigate(next: View, needsAuth = false) {
    if (needsAuth && !session) { setReturnView(next); setView("auth"); }
    else setView(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function signOut() {
    try {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
      setView("home");
      setMobileNav(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  }

  if (!authReady) return <div className="app-loader" role="status"><LensMark /><span>Opening your workspace</span><LoaderCircle className="spin" size={16} /></div>;

  return (
    <div className="lens-app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="shell-header">
        <div className="shell-header-inner">
          <button className="lens-brand" onClick={() => navigate("home")} aria-label="ResumeLens home"><LensMark /><span>ResumeLens</span></button>
          <nav id="primary-navigation" className={`shell-navigation ${mobileNav ? "is-open" : ""}`} aria-label="Primary navigation">
            {navigation.map((item) => <button key={item.id} className={view === item.id ? "is-active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id, item.protected)}>{item.label}</button>)}
          </nav>
          <div className="shell-account">
            {session ? <><span className="shell-account-email" title={session.user.email}>{session.user.email}</span><button className="shell-signout" onClick={signOut} aria-label="Sign out"><LogOut size={15} /><span>Sign out</span></button></> : view !== "auth" ? <button className="shell-signin" onClick={() => { setReturnView("home"); navigate("auth"); }}>Sign in <ArrowRight size={13} /></button> : <span className="shell-account-note">Your resume workspace</span>}
            <button ref={menuButton} className="shell-menu-toggle" aria-label={mobileNav ? "Close navigation" : "Open navigation"} aria-expanded={mobileNav} aria-controls="primary-navigation" onClick={() => setMobileNav(!mobileNav)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
      </header>
      <main id="main-content" className={`shell-main ${view === "home" ? "shell-main-home" : ""}`}>
        {authError && <div className="shell-notice"><p className="error-box" role="alert">{authError}</p></div>}
        {view === "home" && <HomeView onAnalyze={() => navigate("analyzer", true)} onResources={() => navigate("resources")} />}
        {view === "auth" && <AuthView onBack={() => navigate("home")} onSuccess={() => { setAuthError(""); navigate(returnView); }} />}
        {view === "analyzer" && session && <AnalyzerView token={session.access_token} />}
        {view === "history" && session && <HistoryView token={session.access_token} onAnalyze={() => navigate("analyzer")} />}
        {view === "resources" && <ResourcesView onAnalyze={() => navigate("analyzer", true)} />}
      </main>
      <footer className="shell-footer"><div><span>ResumeLens</span><span>A clearer view of your next application.</span></div><span>PDF &amp; DOCX · Up to 5 MB</span></footer>
    </div>
  );
}

function HomeView({ onAnalyze, onResources }: { onAnalyze: () => void; onResources: () => void }) {
  return <div className="marketing-home">
    <section className="landing-hero">
      <h1>See your resume<br />through a sharper lens.</h1>
      <div className="landing-hero-copy"><p>Understand what your resume communicates before you apply. Match it to a role, find the gaps, and make every edit count.</p><button className="button primary landing-cta" onClick={onAnalyze}>Analyze my resume <ArrowRight size={16} /></button><span className="landing-file-note">PDF or DOCX · Up to 5 MB</span></div>
    </section>
    <ProductPreview />
    <section className="landing-method">
      <div className="landing-method-intro"><h2>From a first impression<br />to a focused plan.</h2><p>A structured review of the details that help a resume read clearly, match a role, and show the evidence behind your skills.</p><button className="landing-text-link" onClick={onResources}>Explore the resume guides <ArrowRight size={15} /></button></div>
      <div className="landing-method-list">
        <article><ScanLine size={18} /><div><h3>Read the structure</h3><p>Check sections, formatting, and ATS-readable content.</p></div></article>
        <article><Layers3 size={18} /><div><h3>Understand the fit</h3><p>Compare role language and identify missing skills and keywords.</p></div></article>
        <article><FileCheck2 size={18} /><div><h3>Know what to change</h3><p>Get specific recommendations, save your analysis, and export the full report.</p></div></article>
      </div>
    </section>
  </div>;
}

function ProductPreview() {
  const [tab, setTab] = useState<"overview" | "keywords" | "recommendations">("overview");
  const tabs = [{ id: "overview" as const, label: "Overview" }, { id: "keywords" as const, label: "Role match" }, { id: "recommendations" as const, label: "Recommendations" }];
  const scores = [{ name: "Formatting", value: 18, max: 20 }, { name: "Keywords", value: 21, max: 25 }, { name: "Content", value: 20, max: 25 }, { name: "Skill evidence", value: 12, max: 15 }, { name: "ATS compatibility", value: 13, max: 15 }];
  return <figure className="product-preview" aria-label="Interactive example of a ResumeLens report">
    <figcaption className="preview-toolbar"><div className="preview-file"><FileText size={16} /><span>maya-shah_resume.pdf</span><ChevronRight size={13} /><span>Analysis</span></div><span className="preview-example-label">Example report</span></figcaption>
    <div className="preview-app-header"><div><span className="preview-document-title">Resume analysis</span><p>Product analyst <span>·</span> Mid level</p></div><span className="preview-complete"><Check size={13} /> Analysis complete</span></div>
    <div className="preview-tabs" role="tablist" aria-label="Example report sections">{tabs.map((item) => <button id={`preview-tab-${item.id}`} key={item.id} role="tab" aria-selected={tab === item.id} aria-controls="preview-panel" className={tab === item.id ? "is-selected" : ""} onClick={() => setTab(item.id)}>{item.label}{item.id === "recommendations" && <span>3</span>}</button>)}</div>
    <div id="preview-panel" className="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${tab}`}>
      {tab === "overview" && <div className="preview-overview"><div className="preview-score-summary"><div className="preview-score-number">84<span>/ 100</span></div><h3>Strong foundation.</h3><p>A clear structure with relevant experience. A few focused edits can make the role fit more explicit.</p><div className="preview-fact-pair"><div><strong>76%</strong><span>Keyword coverage</span></div><div><strong>3</strong><span>Priority edits</span></div></div></div><div className="preview-score-list"><div className="preview-section-title"><span>Score breakdown</span><span>Contribution</span></div>{scores.map((score) => <div className="preview-score-row" key={score.name}><span>{score.name}</span><div className="preview-score-bar"><i style={{ width: `${score.value / score.max * 100}%` }} /></div><span className="preview-score-value">{score.value}<small>/{score.max}</small></span></div>)}<div className="preview-insight"><FileCheck2 size={15} /><span>Skills cross-checked against projects and experience</span></div></div></div>}
      {tab === "keywords" && <div className="preview-keyword-layout"><div className="preview-copy-block"><h3>Make the role fit visible.</h3><p>Compare the language in the resume with the requirements of a Product analyst role.</p><span className="preview-plain-stat">76% keyword coverage</span></div><div className="preview-keyword-groups"><div><h4>Matched keywords</h4><div>{["SQL", "Experimentation", "Dashboards", "Data analysis", "Stakeholders"].map((word) => <span key={word}><Check size={12} />{word}</span>)}</div></div><div><h4>Terms to consider</h4><div>{["Funnel analysis", "Cohort analysis", "Product metrics"].map((word) => <span key={word}>{word}</span>)}</div></div><p>Use relevant terms naturally, supported by your actual work.</p></div></div>}
      {tab === "recommendations" && <div className="preview-recommendations"><div className="preview-copy-block"><h3>Less guesswork.<br />A clear next edit.</h3><p>Prioritized suggestions connect each issue to an action you can take.</p></div><div className="preview-edit-list">{[{ title: "Add the outcome to your experience", detail: "Pair the work with its scope and a measurable result.", label: "Content" }, { title: "Mirror relevant role language", detail: "Add funnel and cohort analysis where your experience supports it.", label: "Role fit" }, { title: "Tighten the longest bullet points", detail: "Lead with an action and keep each point easy to scan.", label: "Structure" }].map((item) => <article key={item.title}><div><span className="preview-edit-label">{item.label}</span><h4>{item.title}</h4><p>{item.detail}</p></div><ArrowRight size={15} /></article>)}</div></div>}
    </div>
    <div className="preview-bottom-bar"><span><FileCheck2 size={13} /> Evidence-based resume feedback</span><span>Illustrative content · Your results will vary</span></div>
  </figure>;
}

function AuthView({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const auth = getSupabase().auth;
      const result = mode === "signin"
        ? await auth.signInWithPassword({ email: email.trim(), password })
        : await auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
      if (result.error) throw result.error;
      if (result.data.session) onSuccess(); else setMessage("Check your inbox to confirm your account, then return here to sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not access your account. Please try again.");
    } finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setMessage("");
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
    } finally { setBusy(false); }
  }
  return <section className="auth-layout">
    <div className="auth-context"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to overview</button><div className="auth-context-copy"><LensMark /><h2>A clearer view.<br />A stronger next step.</h2><p>Your reports, role comparisons, and analysis history. Together in one focused workspace.</p><div className="auth-context-detail"><FileText size={15} /><span>Resume analysis, with the evidence behind it.</span></div></div></div>
    <div className="auth-form-column"><div className="auth-card"><h1>{mode === "signin" ? "Welcome back." : "Create your account."}</h1><p className="auth-description">{mode === "signin" ? "Sign in to continue to your resume workspace." : "Keep your reports and analysis history in one place."}</p><div className="auth-tabs" aria-label="Account access"><button className={mode === "signin" ? "is-selected" : ""} aria-pressed={mode === "signin"} disabled={busy} onClick={() => { setMode("signin"); setMessage(""); }}>Sign in</button><button className={mode === "signup" ? "is-selected" : ""} aria-pressed={mode === "signup"} disabled={busy} onClick={() => { setMode("signup"); setMessage(""); }}>Create account</button></div><form onSubmit={submit}><label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="email" required disabled={busy} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /><label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required disabled={busy} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />{message && <p className="form-message" role="status">{message}</p>}<button className="button primary full auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}{mode === "signin" ? "Sign in" : "Create account"}{!busy && <ArrowRight size={15} />}</button></form><div className="auth-divider"><span>or continue with</span></div><button className="button secondary full auth-google" disabled={busy} onClick={google}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.88-1.74 2.99-4.3 2.99-7.36ZM12 22c2.7 0 4.96-.9 6.61-2.41l-3.22-2.51c-.9.6-2.04.97-3.39.97-2.6 0-4.8-1.76-5.59-4.12H3.08v2.59A10 10 0 0 0 12 22ZM6.41 13.93A6 6 0 0 1 6.1 12c0-.67.12-1.32.31-1.93V7.48H3.08a10 10 0 0 0 0 9.04l3.33-2.59ZM12 5.95c1.48 0 2.8.51 3.85 1.51l2.88-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.92 5.48l3.33 2.59C7.2 7.71 9.4 5.95 12 5.95Z" /></svg>Google</button>{mode === "signup" && <p className="auth-confirmation-note">We’ll email you a confirmation link to activate your account.</p>}</div></div>
  </section>;
}
