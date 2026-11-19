import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { serviceFetch } from "../src/lib/request.ts";

process.env.NEXT_PUBLIC_API_URL = "https://analysis.example.test/";
const { analyzeResume, getHistory, validateResume } = await import("../src/lib/api.ts");

test("unavailable authentication produces an actionable error", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  try {
    await assert.rejects(serviceFetch("https://auth.example.test", {}, "The account service", 1000),
      /The account service is currently unreachable/);
  } finally { fetch.mock.restore(); }
});

test("a stalled service times out instead of leaving the UI waiting", async () => {
  const fetch = mock.method(globalThis, "fetch", (_input, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  // Keep the event loop alive: AbortSignal.timeout uses an unreferenced timer.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await assert.rejects(serviceFetch("https://auth.example.test", {}, "The account service", 5), /took too long/);
  } finally { clearInterval(keepAlive); fetch.mock.restore(); }
});

test("caller cancellation is preserved", async () => {
  const controller = new AbortController();
  controller.abort();
  const fetch = mock.method(globalThis, "fetch", async (_input, { signal }) => { signal.throwIfAborted(); });
  try {
    await assert.rejects(serviceFetch("https://auth.example.test", { signal: controller.signal }, "Accounts", 1000),
      { name: "AbortError" });
  } finally { fetch.mock.restore(); }
});

test("resume validation accepts supported formats and rejects empty, unsupported, and oversized files", () => {
  for (const name of ["resume.PDF", "resume.docx"]) {
    assert.doesNotThrow(() => validateResume(new File(["resume"], name)));
  }
  assert.throws(() => validateResume(new File([], "resume.pdf")), /empty/);
  assert.throws(() => validateResume(new File(["legacy resume"], "resume.doc")), /Convert legacy DOC/);
  assert.throws(() => validateResume(new File(["resume"], "resume.exe")), /PDF or DOCX/);
  assert.throws(() => validateResume(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "resume.pdf")), /5 MB/);
});

test("resume upload preserves the multipart file, job description, and access token", async () => {
  const file = new File(["resume content"], "resume.pdf", { type: "application/pdf" });
  const fetch = mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://analysis.example.test/api/v1/analyze-resume");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer test-session");
    assert.equal(init.headers["Content-Type"], undefined);
    assert.equal(init.body.get("resume"), file);
    assert.equal(init.body.get("job_description"), "Python engineer");
    return Response.json({ ATS_score: 75, component_scores: {} });
  });
  try { assert.equal((await analyzeResume(file, "Python engineer", "test-session")).ATS_score, 75); }
  finally { fetch.mock.restore(); }
});

test("invalid files never reach the upload endpoint", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected upload"); });
  try {
    await assert.rejects(analyzeResume(new File([], "resume.pdf"), "", "test-session"), /empty/);
    assert.equal(fetch.mock.callCount(), 0);
  } finally { fetch.mock.restore(); }
});

for (const [status, body, expected] of [
  [401, "", /session has expired/],
  [503, "<html>Server unavailable</html>", /temporarily unavailable/],
  [422, JSON.stringify({ detail: "Could not read the resume" }), /Could not read the resume/],
  [404, "<html>Not found</html>", /Request failed with status 404/],
]) {
  test(`API ${status} response produces a readable error`, async () => {
    const fetch = mock.method(globalThis, "fetch", async () => new Response(body, { status }));
    try { await assert.rejects(getHistory("test-session"), expected); }
    finally { fetch.mock.restore(); }
  });
}
