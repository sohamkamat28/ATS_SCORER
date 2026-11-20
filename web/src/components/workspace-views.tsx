"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Award, Check, Clock3, Download, FileSearch, Lightbulb, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { analyzeResume, deleteHistory, downloadReport, getHistory, validateResume, type Analysis } from "@/lib/api";

type HistoryItem = { id: string | number; filename: string; ats_score: number; created_at: string; analysis_result: Analysis };

export function AnalyzerView({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null); const [jd, setJd] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  function chooseFile(nextFile: File | null) {
    setError(""); setAnalysis(null);
    try {
      if (nextFile) validateResume(nextFile);
      setFile(nextFile);
    } catch (error) {
      setFile(null);
      setError(error instanceof Error ? error.message : "Please choose a valid resume.");
    }
  }
  async function run() { if (!file || busy) return; setBusy(true); setError(""); try { setAnalysis(await analyzeResume(file, jd, token)); } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); } finally { setBusy(false); } }
  async function download() { if (!analysis) return; const blob = await downloadReport(analysis, token); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "ats-resume-report.pdf"; a.click(); URL.revokeObjectURL(url); }
  return <section className="page"><PageHeading title="Resume scoring workspace" copy="Upload a resume, add role context when available, and review a structured ATS readiness report." /><div className="analyzer-grid"><article className="upload-panel"><label className={`dropzone ${file ? "has-file" : ""}`}><UploadCloud /><strong>{file ? file.name : "Choose your resume"}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF or DOCX, up to 5 MB"}</span><input type="file" accept=".pdf,.docx" onChange={(e) => { chooseFile(e.target.files?.[0] || null); e.target.value = ""; }} /></label><label className="field-label">Job description <span>Optional</span><textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the role description for targeted matching..." /></label>{error && <p className="error-box" role="alert">{error}</p>}<button className="button primary full" disabled={!file || busy} onClick={run}>{busy ? <><LoaderCircle className="spin" /> Analyzing resume</> : <><FileSearch /> Analyze resume</>}</button></article><aside className="analysis-guide"><h2>What gets checked</h2><p className="analysis-guide-intro">A focused review across five signals.</p>{["ATS-readable formatting", "Role and keyword coverage", "Evidence-backed skills", "Content quality and metrics", "Recruiter-ready recommendations"].map((x) => <p key={x}><Check /> {x}</p>)}</aside></div>{analysis && <Results analysis={analysis} onDownload={download} />}</section>;
}

export function Results({ analysis, onDownload }: { analysis: Analysis; onDownload: () => void }) {
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
      <div className="report-score"><strong>{score}</strong><span>ATS score<br />out of 100</span></div>
      <div className="report-summary-copy">
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
      <ReportSectionHeading title="Score breakdown" copy="How each part of the resume contributes to the overall score." />
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
        <ReportSectionHeading title="What is working" copy="Signals already helping your resume." />
        <div className="strength-list">
          {strengths.map((item) => <p key={item}><span><Check /></span>{item}</p>)}
        </div>
      </section>

      <section className="report-section skill-section">
        <ReportSectionHeading title="Skill evidence" copy="Claims cross-checked against projects and experience." />
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
      <ReportSectionHeading title="Role match" copy="Language and capabilities compared with the supplied job description." />
      <div className="role-layout">
        <div className="match-score"><span>Overall match</span><strong>{Math.round(analysis.jd_match_analysis.match_percentage)}%</strong><small>{Math.round(analysis.jd_match_analysis.semantic_similarity * 100)}% semantic similarity</small></div>
        <KeywordGroup title="Matched keywords" values={analysis.jd_match_analysis.matched_keywords} positive />
        <KeywordGroup title="Missing keywords" values={analysis.jd_match_analysis.missing_keywords} />
      </div>
      {!!analysis.jd_match_analysis.skills_gap.length && <KeywordGroup title="Skills gap" values={analysis.jd_match_analysis.skills_gap} warning />}
    </section>}

    <section className="report-section recommendations-section">
      <div className="recommendations-heading">
        <ReportSectionHeading title="Recommendations" copy="Every detected issue, ordered by practical impact." />
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

function ReportSectionHeading({ title, copy }: { title: string; copy: string }) { return <header className="report-section-heading"><div><h2>{title}</h2><p>{copy}</p></div></header>; }

function deriveStrengths(scores: Record<string, number>, labels: Record<string, string>, maximums: Record<string, number>) { return Object.entries(scores).filter(([key, value]) => value / (maximums[key] || 100) >= .72).map(([key]) => `${labels[key] || key} is performing above the target benchmark`); }

function severityClass(value: string) { const severity = value?.toLowerCase(); return severity === "high" ? "high" : severity === "moderate" || severity === "medium" ? "moderate" : "low"; }

function KeywordGroup({ title, values, positive = false, warning = false }: { title: string; values: string[]; positive?: boolean; warning?: boolean }) { return <div className="keyword-group"><span>{title}</span><div>{values.map((x) => <i className={positive ? "positive" : warning ? "warning" : ""} key={x}>{x}</i>)}</div></div>; }

export function HistoryView({ token, onAnalyze }: { token: string; onAnalyze: () => void }) {
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
  if (selected) return <section className="page history-report"><button className="back-link" onClick={() => setSelected(null)}><ArrowLeft /> Back to history</button><PageHeading title={selected.filename} copy={`Analyzed ${new Date(selected.created_at).toLocaleDateString(undefined, { dateStyle: "long" })}`} /><Results analysis={selected.analysis_result} onDownload={downloadSelected} /></section>;
  return <section className="page"><PageHeading title="Previous resume analyses" copy="Review completed scans, compare score movement, and remove outdated reports." />{busy ? <div className="empty-state"><LoaderCircle className="spin" /> Loading reports</div> : error ? <p className="error-box" role="alert">{error}</p> : items.length === 0 ? <div className="empty-state"><Clock3 /><h2>No reports yet</h2><p>Your completed resume analyses will appear here.</p><button className="button primary" onClick={onAnalyze}>Open analyzer</button></div> : <div className="history-list">{items.map((item) => <article key={item.id}><div className="file-icon"><FileSearch /></div><div><strong>{item.filename}</strong><span>{new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</span></div><div className="history-score"><strong>{Math.round(item.ats_score)}</strong><span>ATS score</span></div><button className="button history-view" onClick={() => setSelected(item)}>View report</button><button className="icon-button" onClick={() => remove(item.id)} aria-label={`Delete ${item.filename}`}><Trash2 /></button></article>)}</div>}</section>;
}

export function ResourcesView({ onAnalyze }: { onAnalyze: () => void }) { const resources = [{ title: "ATS formatting checklist", text: "Use conventional headings, simple columns, and selectable text." }, { title: "Keyword matching guide", text: "Mirror role language naturally and prioritize recurring requirements." }, { title: "Evidence-first bullets", text: "Pair actions with scope, outcome, and a credible metric." }, { title: "Before you submit", text: "Check links, file naming, dates, and role-specific terminology." }]; return <section className="page"><PageHeading title="Build a resume that reads clearly" copy="Practical guidance for stronger ATS parsing and more convincing recruiter review." /><div className="resource-grid">{resources.map((x) => <article key={x.title}><h2>{x.title}</h2><p>{x.text}</p></article>)}</div><button className="button primary resource-cta" onClick={onAnalyze}>Analyze your resume <ArrowRight /></button></section>; }

function PageHeading({ title, copy }: { title: string; copy: string }) { return <header className="page-heading"><h1>{title}</h1><p>{copy}</p></header>; }
