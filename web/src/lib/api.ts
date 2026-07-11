export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

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
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response;
}

export async function analyzeResume(file: File, jd: string, token: string): Promise<Analysis> {
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
