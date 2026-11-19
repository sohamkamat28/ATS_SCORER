import { serviceFetch } from "./request.ts";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "")).replace(/\/$/, "");

export function validateResume(file: File) {
  if (!/\.(pdf|docx)$/i.test(file.name)) throw new Error("Choose a PDF or DOCX resume. Convert legacy DOC files before uploading.");
  if (!file.size) throw new Error("This file is empty. Please choose your resume again.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Your resume must be 5 MB or smaller.");
}

export type Analysis = {
  ATS_score: number;
  ats_score: number;
  component_scores: Record<string, number>;
  issues_summary: string[];
  detailed_feedback: Array<{
    issue_title: string;
    severity_level: string;
    ats_impact: string;
    explanation: string;
    where_it_appears: string;
    how_to_fix: string;
    action_items: string[];
    example_improvement: string;
  }>;
  jd_match_analysis?: {
    match_percentage: number;
    semantic_similarity: number;
    matched_keywords: string[];
    missing_keywords: string[];
    skills_gap: string[];
  };
  skill_validation_details?: {
    validated: Array<{ skill: string; projects: string[] }>;
    unvalidated: string[];
    total: number;
    validated_count: number;
    validation_pct: number;
  };
  strengths?: string[];
  skills?: string[];
  interpretation?: string;
};

async function apiFetch(path: string, token: string, init?: RequestInit) {
  if (!API_URL) throw new Error("Resume analysis is not configured. Please contact the site owner.");
  const response = await serviceFetch(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  }, "The resume analysis service", 120000);
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session has expired. Please sign out and sign in again.");
    if (response.status >= 500) throw new Error("The resume analysis service is temporarily unavailable. Please try again in a moment.");
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    throw new Error(typeof detail === "string" ? detail : `Request failed with status ${response.status}. Please try again.`);
  }
  return response;
}

export async function analyzeResume(file: File, jd: string, token: string): Promise<Analysis> {
  validateResume(file);
  const body = new FormData();
  body.append("resume", file);
  body.append("job_description", jd);
  return (await apiFetch("/api/v1/analyze-resume", token, { method: "POST", body })).json();
}

export async function getHistory(token: string) {
  return (await apiFetch("/api/v1/history", token)).json();
}

export async function deleteHistory(id: string, token: string) {
  await apiFetch(`/api/v1/history/${id}`, token, { method: "DELETE" });
}

export async function downloadReport(analysis: Analysis, token: string) {
  return (await apiFetch("/api/v1/generate-pdf", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(analysis),
  })).blob();
}
