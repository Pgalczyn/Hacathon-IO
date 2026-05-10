import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./index.css";

const API_URL = "http://localhost:3000";

const FORMAT_BADGE = {
  video: "bg-danger",
  article: "bg-info",
  book: "bg-warning text-dark",
  course: "bg-success",
  podcast: "bg-secondary",
  interview: "bg-secondary",
  exercise: "bg-primary",
};

export const reviewRouteFor = (type) => (type === "video" ? "/videoreview" : "/textreview");

export function loadCachedPlan() {
  try {
    const raw = localStorage.getItem("currentPlan");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const TaskCard = ({ task, planId, taskIndex }) => {
  const navigate = useNavigate();
  const handleReview = () => {
    navigate(reviewRouteFor(task.format), {
      state: {
        material: {
          key: `task-${task.day}-${taskIndex}`,
          title: task.title,
          type: task.format,
          url: task.url ?? null,
          source: task.source ?? null,
          planId: planId ?? null,
        },
      },
    });
  };

  return (
    <div className="card mb-2 shadow-sm" style={{ borderRadius: "12px" }}>
      <div className="card-body py-2 px-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <h6 className="mb-1 fw-semibold">{task.title}</h6>
          <span className={`badge ${FORMAT_BADGE[task.format] ?? "bg-dark"} flex-shrink-0`}>
            {task.format}
          </span>
        </div>
        {task.source && <div className="small text-muted mb-1">{task.source}</div>}
        <div className="small mb-1">{task.description}</div>
        <div className="small text-muted fst-italic">{task.why_this}</div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span className="small text-muted">~{task.estimated_time_minutes} min</span>
          <div className="d-flex gap-2">
            {task.url && (
              <a href={task.url} target="_blank" rel="noreferrer" className="small">
                open ↗
              </a>
            )}
            <button
              type="button"
              onClick={handleReview}
              className="btn btn-link p-0 small"
            >
              review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DayBlock = ({ day, tasks, planId }) => (
  <div className="mb-3">
    <h5 className="fw-bold mb-2">Day {day}</h5>
    {tasks.map((t, i) => (
      <TaskCard key={`${t.title}-${i}`} task={t} planId={planId} taskIndex={i} />
    ))}
  </div>
);

export const VideoCard = ({ v, onReview }) => (
  <div className="card shadow-sm h-100" style={{ borderRadius: "12px" }}>
    <a href={v.embedUrl} target="_blank" rel="noreferrer">
      {v.thumbnail && (
        <img
          src={v.thumbnail}
          alt={v.title}
          className="card-img-top"
          style={{ borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}
        />
      )}
    </a>
    <div className="card-body py-2 px-3 d-flex justify-content-between align-items-start gap-2">
      <div className="small fw-semibold">{v.title}</div>
      <button type="button" onClick={onReview} className="btn btn-link p-0 small flex-shrink-0">
        review
      </button>
    </div>
  </div>
);

export const SimpleListItem = ({ title, subtitle, href, onReview }) => (
  <div className="card mb-2 shadow-sm" style={{ borderRadius: "12px" }}>
    <div className="card-body py-2 px-3">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="flex-grow-1">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="text-decoration-none text-reset">
              <div className="fw-semibold small">{title}</div>
              {subtitle && <div className="small text-muted">{subtitle}</div>}
            </a>
          ) : (
            <>
              <div className="fw-semibold small">{title}</div>
              {subtitle && <div className="small text-muted">{subtitle}</div>}
            </>
          )}
        </div>
        <button type="button" onClick={onReview} className="btn btn-link p-0 small flex-shrink-0">
          review
        </button>
      </div>
    </div>
  </div>
);

export const PlanView = () => {
  const location = useLocation();
  const navigateRouter = useNavigate();
  const [data, setData] = useState(() => location.state?.plan ?? loadCachedPlan());
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [busy, setBusy] = useState(""); // "accept" | "regenerate" | "next" | ""

  useEffect(() => {
    if (location.state?.plan) {
      setData(location.state.plan);
      return;
    }
    if (data) return;

    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/plan`, { credentials: "include" })
      .then(async (response) => {
        if (cancelled) return;
        if (response.ok) {
          const json = await response.json();
          setData(json);
          try {
            localStorage.setItem("currentPlan", JSON.stringify(json));
          } catch {
            // ignore
          }
          return;
        }
        if (response.status === 401 || response.status === 404) {
          // anonymous or no plan yet — leave data null, render the empty state
          return;
        }
        const json = await response.json().catch(() => ({}));
        setFetchError(json.message ?? `Failed to load plan (${response.status})`);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(err.message ?? "Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const tasksByDay = useMemo(() => {
    if (!data?.plan?.tasks) return {};
    return data.plan.tasks.reduce((acc, t) => {
      const day = t.day ?? 1;
      if (!acc[day]) acc[day] = [];
      acc[day].push(t);
      return acc;
    }, {});
  }, [data]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center w-100 p-5 bg-light">
        <div className="text-muted">Loading your plan…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="d-flex justify-content-center align-items-center w-100 p-5 bg-light">
        <div className="card shadow-sm p-4 text-center" style={{ maxWidth: "420px", borderRadius: "16px" }}>
          <h4 className="mb-3">No plan yet</h4>
          <p className="text-muted">Fill out the learning form to generate your weekly plan.</p>
          {fetchError && <div className="alert alert-warning small">{fetchError}</div>}
          <Link to="/learningform" className="btn purple-btn">Set up my plan</Link>
        </div>
      </div>
    );
  }

  const { validation, plan, materials, planId } = data;
  const status = data.status ?? "accepted"; // legacy plans default to accepted

  const goReview = (route, material) =>
    navigateRouter(route, { state: { material: { ...material, planId: planId ?? null } } });

  const refreshFromBackend = async () => {
    try {
      const r = await fetch(`${API_URL}/plan`, { credentials: "include" });
      if (r.ok) {
        const j = await r.json();
        setData(j);
        try { localStorage.setItem("currentPlan", JSON.stringify(j)); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  };

  const handleAccept = async () => {
    setBusy("accept");
    try {
      const r = await fetch(`${API_URL}/plan/accept`, { method: "POST", credentials: "include" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setFetchError(j.message || `Failed (${r.status})`);
        return;
      }
      await refreshFromBackend();
    } finally {
      setBusy("");
    }
  };

  const handleAction = async (path, label) => {
    setBusy(label);
    setFetchError("");
    try {
      const r = await fetch(`${API_URL}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json();
      if (!r.ok) {
        setFetchError(j.message || j.error || `Failed (${r.status})`);
        return;
      }
      // /regenerate and /next return the same shape as /onboarding —
      // we can drop it straight into local state.
      setData(j);
      try { localStorage.setItem("currentPlan", JSON.stringify(j)); } catch { /* ignore */ }
    } catch (err) {
      setFetchError(err.message || "Network error");
    } finally {
      setBusy("");
    }
  };

  if (!validation?.accepted || !plan) {
    return (
      <div className="d-flex justify-content-center align-items-start w-100 py-4 bg-light">
        <div className="card shadow-sm p-4" style={{ maxWidth: "560px", borderRadius: "16px" }}>
          <h4 className="text-warning fw-bold mb-2">We can't plan this goal</h4>
          <p>{validation?.rejection_reason ?? "Please try a different goal."}</p>
          {validation?.rejection_category && (
            <p className="small text-muted">Category: {validation.rejection_category}</p>
          )}
          <Link to="/learningform" className="btn purple-btn mt-2">Try again</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm p-4 mb-3" style={{ borderRadius: "16px" }}>
            <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
              <h3 className="fw-bold mb-0">{plan.weekly_focus}</h3>
              <span
                className={`badge flex-shrink-0 ${
                  status === "draft"
                    ? "bg-warning text-dark"
                    : status === "completed"
                      ? "bg-secondary"
                      : "bg-success"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-muted">{plan.topic_summary}</p>
            <div className="small text-muted mb-3">
              ~{plan.daily_time_minutes} minutes per day · {plan.tasks.length} tasks
            </div>

            {status === "draft" && (
              <div className="alert alert-warning small mb-3">
                <strong>Draft plan.</strong> Accept it to commit to this week, or regenerate
                if you'd like a different take.
              </div>
            )}

            <div className="d-flex gap-2 flex-wrap">
              {status === "draft" && (
                <>
                  <button
                    type="button"
                    className="btn purple-btn"
                    onClick={handleAccept}
                    disabled={busy !== ""}
                  >
                    {busy === "accept" ? "Accepting…" : "Accept this plan"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => handleAction("/plan/regenerate", "regenerate")}
                    disabled={busy !== ""}
                  >
                    {busy === "regenerate" ? "Regenerating…" : "Regenerate"}
                  </button>
                </>
              )}
              {(status === "accepted" || status === "completed") && (
                <button
                  type="button"
                  className="btn purple-btn"
                  onClick={() => handleAction("/plan/next", "next")}
                  disabled={busy !== ""}
                >
                  {busy === "next" ? "Generating next week…" : "Generate next week's plan"}
                </button>
              )}
            </div>

            {fetchError && status !== "draft" && (
              <div className="alert alert-danger small mt-3 mb-0">{fetchError}</div>
            )}
          </div>

          {Object.keys(tasksByDay)
            .map(Number)
            .sort((a, b) => a - b)
            .map((day) => (
              <DayBlock key={day} day={day} tasks={tasksByDay[day]} planId={planId} />
            ))}

          <div className="d-flex gap-2 mt-2 flex-wrap">
            <Link to="/learningform" className="btn btn-outline-secondary">
              Generate a new plan
            </Link>
            <Link to="/conversation" className="btn btn-outline-primary">
              Talk to your tutor
            </Link>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm p-4 mb-3" style={{ borderRadius: "16px" }}>
            <h5 className="fw-bold mb-3">Real materials we found</h5>

            {materials?.videos?.length > 0 && (
              <>
                <h6 className="text-muted text-uppercase small mt-2">Videos</h6>
                <div className="row g-2">
                  {materials.videos.map((v, i) => (
                    <div key={v.videoId} className="col-12">
                      <VideoCard
                        v={v}
                        onReview={() =>
                          goReview("/videoreview", {
                            key: `video-${i}`,
                            title: v.title,
                            type: "video",
                            url: v.embedUrl ?? null,
                            source: "YouTube",
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {materials?.books?.length > 0 && (
              <>
                <h6 className="text-muted text-uppercase small mt-3">Books (Project Gutenberg)</h6>
                {materials.books.map((b, i) => (
                  <SimpleListItem
                    key={`${b.title}-${i}`}
                    title={b.title}
                    subtitle={b.author}
                    href={b.readUrl}
                    onReview={() =>
                      goReview("/textreview", {
                        key: `book-${i}`,
                        title: b.title,
                        type: "book",
                        url: b.readUrl ?? null,
                        source: b.author ?? "Project Gutenberg",
                      })
                    }
                  />
                ))}
              </>
            )}

            {materials?.academic_papers?.length > 0 && (
              <>
                <h6 className="text-muted text-uppercase small mt-3">Academic papers (OpenAlex)</h6>
                {materials.academic_papers.map((p, i) => (
                  <SimpleListItem
                    key={`${p.title}-${i}`}
                    title={p.title}
                    subtitle={`${p.author}${p.year ? ` · ${p.year}` : ""}`}
                    href={p.pdfUrl}
                    onReview={() =>
                      goReview("/textreview", {
                        key: `paper-${i}`,
                        title: p.title,
                        type: "article",
                        url: p.pdfUrl ?? null,
                        source: `${p.author}${p.year ? ` · ${p.year}` : ""}`,
                      })
                    }
                  />
                ))}
              </>
            )}

            {(!materials ||
              ((materials.videos?.length ?? 0) === 0 &&
                (materials.books?.length ?? 0) === 0 &&
                (materials.academic_papers?.length ?? 0) === 0)) && (
              <div className="text-muted small">
                No external materials returned this time. The plan above is your starting point.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanView;
