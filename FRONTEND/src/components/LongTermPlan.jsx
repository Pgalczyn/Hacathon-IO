import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./index.css";

import API_URL from "../api.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Compute the calendar coordinates for monthIndex 1..12 of a plan that
 *  starts at `yearStartDate`. Returns { year, monthName, daysInMonth,
 *  firstWeekday } where firstWeekday is 0=Sun..6=Sat. */
function describeMonth(yearStartDate, monthIndex) {
  const start = new Date(yearStartDate);
  const target = new Date(
    start.getFullYear(),
    start.getMonth() + (monthIndex - 1),
    1,
  );
  const year = target.getFullYear();
  const monthName = MONTH_NAMES[target.getMonth()];
  const daysInMonth = new Date(year, target.getMonth() + 1, 0).getDate();
  const firstWeekday = target.getDay();
  return { year, monthName, daysInMonth, firstWeekday };
}

const DayCell = ({ day, tasks, blank }) => {
  if (blank) {
    return (
      <div
        className="border"
        style={{ minHeight: 90, background: "#f3f4f6", borderRadius: 6 }}
      />
    );
  }
  return (
    <div
      className="border bg-white p-2"
      style={{ minHeight: 90, borderRadius: 6, fontSize: "0.85rem" }}
    >
      <div className="fw-bold mb-1">{day}</div>
      {tasks.slice(0, 3).map((t, i) => (
        <div
          key={i}
          style={{
            color: "var(--purple, #6f42c1)",
            fontSize: "0.75rem",
            lineHeight: 1.2,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={t.title}
        >
          {t.title}
        </div>
      ))}
      {tasks.length > 3 && (
        <div className="small text-muted">+{tasks.length - 3} more</div>
      )}
    </div>
  );
};

const Calendar = ({ plan, monthIndex, onPrev, onNext }) => {
  const month = useMemo(
    () => plan.months.find((m) => m.monthIndex === monthIndex) ?? null,
    [plan, monthIndex],
  );
  const { year, monthName, daysInMonth, firstWeekday } = useMemo(
    () => describeMonth(plan.yearStartDate, monthIndex),
    [plan.yearStartDate, monthIndex],
  );

  const tasksByDay = useMemo(() => {
    const map = new Map();
    if (month) {
      for (const t of month.tasks) {
        if (!map.has(t.day)) map.set(t.day, []);
        map.get(t.day).push(t);
      }
    }
    return map;
  }, [month]);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ blank: true, key: `b-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      blank: false,
      day: d,
      tasks: tasksByDay.get(d) ?? [],
      key: `d-${d}`,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ blank: true, key: `t-${cells.length}` });
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn purple-btn"
          onClick={onPrev}
          disabled={monthIndex === 1}
        >
          ‹ Previous Month
        </button>
        <h3 className="m-0 fw-bold">
          {monthName} {year}
        </h3>
        <button
          className="btn purple-btn"
          onClick={onNext}
          disabled={monthIndex === 12}
        >
          Next Month ›
        </button>
      </div>

      {month?.theme && (
        <div className="mb-3 text-muted fst-italic text-center">
          {month.theme}
        </div>
      )}

      <div
        className="d-grid mb-2"
        style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}
      >
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center fw-semibold small text-muted">
            {d}
          </div>
        ))}
      </div>

      <div
        className="d-grid"
        style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}
      >
        {cells.map((c) =>
          c.blank ? (
            <DayCell key={c.key} blank />
          ) : (
            <DayCell key={c.key} day={c.day} tasks={c.tasks} />
          ),
        )}
      </div>
    </div>
  );
};

const LongTermPlan = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [monthIndex, setMonthIndex] = useState(1);

  // Onboarding kicks off yearly generation in the background and returns
  // before it finishes. So when this page mounts after a fresh /onboarding
  // submit, /longplan often returns 404 for a while. Poll every few seconds
  // (the LLM call typically takes ~30s) instead of forcing the user to
  // press a button. Cap at 2 minutes so we don't loop forever if the
  // background job died.
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    const startedAt = Date.now();
    const POLL_BUDGET_MS = 120_000;

    const fetchOnce = async () => {
      try {
        const r = await fetch(`${API_URL}/longplan`, { credentials: "include" });
        if (cancelled) return;
        if (r.status === 401) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
        if (r.status === 404) {
          if (Date.now() - startedAt >= POLL_BUDGET_MS) {
            // Likely the background job failed. Stop polling and let the
            // user trigger a manual regen from the empty-state CTA.
            setLoading(false);
            return;
          }
          if (!cancelled) {
            timeoutId = setTimeout(fetchOnce, 4000);
          }
          return;
        }
        const j = await r.json();
        if (!r.ok) {
          setError(j.message || `Failed (${r.status})`);
          setLoading(false);
          return;
        }
        setPlan(j);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || "Network error");
        setLoading(false);
      }
    };

    fetchOnce();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleGenerate = async () => {
    setError("");
    setGenerating(true);
    try {
      const r = await fetch(`${API_URL}/longplan`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (r.status === 401) {
        setUnauthorized(true);
        return;
      }
      const j = await r.json();
      if (!r.ok) {
        setError(j.message || `Failed (${r.status})`);
        return;
      }
      setPlan(j);
      setMonthIndex(1);
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setGenerating(false);
    }
  };

  if (unauthorized) {
    return (
      <div className="container py-4">
        <div
          className="card shadow-sm p-4 text-center mx-auto"
          style={{ maxWidth: "480px", borderRadius: "16px" }}
        >
          <h3 className="fw-bold mb-3">Yearly Learning Plan</h3>
          <p className="text-muted">Sign in to generate a 12-month plan.</p>
          <Link to="/login" className="btn purple-btn btn-lg">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-5">
        <div
          className="card shadow-sm p-4 text-center mx-auto"
          style={{ maxWidth: "560px", borderRadius: "16px" }}
        >
          <div
            className="spinner-border mx-auto mb-3"
            style={{ color: "#9f46ed", width: "2.5rem", height: "2.5rem" }}
            role="status"
          />
          <h4 className="fw-bold mb-2">Generating your 12-month roadmap…</h4>
          <p className="text-muted mb-0 small">
            This usually takes ~30s. Hang tight — you can also leave this tab
            open and come back; the calendar will appear automatically.
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container py-4">
        <div
          className="card shadow-sm p-4 text-center mx-auto"
          style={{ maxWidth: "560px", borderRadius: "16px" }}
        >
          <h3 className="fw-bold mb-2">Yearly Learning Plan</h3>
          <p className="text-muted">
            Generate a 12-month roadmap based on your goal — laid out as a
            calendar with topics scheduled day-by-day. Difficulty scales up
            across the year.
          </p>
          {error && <div className="alert alert-danger small">{error}</div>}
          <button
            className="btn purple-btn btn-lg"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating
              ? "Generating (this takes ~30-60s)…"
              : "Generate yearly plan"}
          </button>
          <div className="mt-3 small">
            <Link to="/learningform" className="auth-link">
              Need to set up your goal first?
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-4">
      <div className="card shadow-sm p-4 mb-3" style={{ borderRadius: "16px" }}>
        <h2 className="text-center mb-1 fw-bold">Monthly Learning Plan</h2>
        <div className="text-center text-muted mb-2">{plan.topicSummary}</div>
        <div className="text-center small text-muted fst-italic">
          By month 12 → {plan.yearlyFocus}
        </div>
      </div>

      <div className="card shadow-sm p-4" style={{ borderRadius: "16px" }}>
        <Calendar
          plan={plan}
          monthIndex={monthIndex}
          onPrev={() => setMonthIndex((i) => Math.max(1, i - 1))}
          onNext={() => setMonthIndex((i) => Math.min(12, i + 1))}
        />

        {error && (
          <div className="alert alert-danger small mt-3 mb-0">{error}</div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="small text-muted">
            Month {monthIndex} of 12 ·{" "}
            {plan.months.find((m) => m.monthIndex === monthIndex)?.tasks
              .length ?? 0}{" "}
            tasks
          </div>
          <button
            className="btn btn-outline-secondary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LongTermPlan;
