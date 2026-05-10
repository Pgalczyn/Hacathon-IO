import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./index.css";

const API_URL = "http://localhost:3000";

/** Tiny markdown renderer: paragraphs, bullet lists, bold/italic. Good enough for hackathon. */
function renderMarkdown(md) {
  if (!md) return null;
  const lines = md.split("\n");
  const blocks = [];
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {listBuffer.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />
          ))}
        </ul>,
      );
      listBuffer = [];
    }
  };
  const inline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuffer.push(line.slice(2));
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      blocks.push(
        <h4 key={blocks.length} dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }} />,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h5 key={blocks.length} dangerouslySetInnerHTML={{ __html: inline(line.slice(3)) }} />,
      );
      continue;
    }
    flushList();
    blocks.push(
      <p key={blocks.length} dangerouslySetInnerHTML={{ __html: inline(line) }} />,
    );
  }
  flushList();
  return blocks;
}

const QuizQuestion = ({ q, value, onChange, locked, grade }) => {
  const idx = `q-${q.id}`;
  return (
    <div className="card mb-3 shadow-sm" style={{ borderRadius: "12px" }}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div className="fw-semibold mb-2">{q.question}</div>
          {grade && (
            <span
              className={`badge ${grade.correct ? "bg-success" : "bg-danger"} flex-shrink-0`}
            >
              {grade.correct ? "OK" : "Miss"} ({Math.round(grade.score * 100)}%)
            </span>
          )}
        </div>
        {q.type === "mcq" ? (
          <div className="d-grid gap-2">
            {(q.options || []).map((opt, i) => (
              <div className="form-check" key={i}>
                <input
                  className="form-check-input"
                  type="radio"
                  name={idx}
                  id={`${idx}-${i}`}
                  value={i}
                  checked={String(value) === String(i)}
                  disabled={locked}
                  onChange={() => onChange(String(i))}
                />
                <label className="form-check-label" htmlFor={`${idx}-${i}`}>
                  {opt}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <textarea
            className="form-control"
            rows={3}
            placeholder="Your answer…"
            value={value ?? ""}
            disabled={locked}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {grade?.feedback && (
          <div className="small text-muted mt-2 fst-italic">{grade.feedback}</div>
        )}
      </div>
    </div>
  );
};

const WeeklySummary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/week/summary`, { credentials: "include" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) return;
        if (r.status === 401) {
          setError("Sign in to view your weekly summary.");
          return;
        }
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setError(j.message || `Failed (${r.status})`);
          return;
        }
        setSummary(await r.json());
      })
      .catch((e) => !cancelled && setError(e.message || "Network error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setError("");
    setGenerating(true);
    try {
      const r = await fetch(`${API_URL}/week/summary`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.message || `Failed (${r.status})`);
        return;
      }
      setSummary(j);
      setAnswers({});
      setAttempt(null);
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summary) return;
    const payload = {
      answers: Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value: value ?? "",
      })),
    };
    if (payload.answers.length === 0) {
      setError("Answer at least one question first.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const r = await fetch(`${API_URL}/week/summary/${summary._id}/quiz`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.message || `Failed (${r.status})`);
        return;
      }
      setAttempt(j);
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-4 text-center text-muted">Loading your weekly summary…</div>
    );
  }

  if (!summary) {
    return (
      <div className="container py-4">
        <div className="card shadow-sm p-4 text-center mx-auto" style={{ maxWidth: "560px", borderRadius: "16px" }}>
          <h3 className="fw-bold mb-3">End of the week</h3>
          <p className="text-muted">
            Generate a summary of what you worked on this week, plus a short quiz to check your understanding.
          </p>
          {error && <div className="alert alert-danger small">{error}</div>}
          <button
            className="btn purple-btn btn-lg"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate weekly summary"}
          </button>
          <div className="mt-3 small">
            <Link to="/plan">Back to plan</Link>
          </div>
        </div>
      </div>
    );
  }

  const grades = attempt?.grades ?? [];
  const grademap = Object.fromEntries(grades.map((g) => [g.questionId, g]));

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card shadow-sm p-4" style={{ borderRadius: "16px" }}>
            <h3 className="fw-bold mb-1">{summary.weeklyFocus}</h3>
            <div className="text-muted mb-3 small">{summary.topicSummary}</div>
            <div className="markdown">{renderMarkdown(summary.summaryMarkdown)}</div>
            <div className="mt-3">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm p-4" style={{ borderRadius: "16px" }}>
            <h4 className="fw-bold mb-3">Quiz</h4>
            <form onSubmit={handleSubmit}>
              {summary.quiz.map((q) => (
                <QuizQuestion
                  key={q.id}
                  q={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  locked={Boolean(attempt)}
                  grade={grademap[q.id]}
                />
              ))}

              {error && <div className="alert alert-danger small">{error}</div>}

              {attempt ? (
                <>
                  <div className="alert alert-info">
                    <div className="fw-semibold">
                      Total score: {Math.round(attempt.totalScore * 100)}%
                    </div>
                    <div className="small text-muted">
                      See feedback under each question.
                    </div>
                  </div>
                  <Link to="/conversation" className="btn btn-outline-primary w-100">
                    Talk to your tutor about it
                  </Link>
                </>
              ) : (
                <button type="submit" className="btn purple-btn w-100" disabled={submitting}>
                  {submitting ? "Grading…" : "Submit answers"}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary;
