import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./index.css";

import API_URL from "../api.js";

const FORMAT_BADGE = {
  video: "bg-danger",
  article: "bg-info",
  book: "bg-warning text-dark",
  course: "bg-success",
  podcast: "bg-secondary",
  interview: "bg-secondary",
  exercise: "bg-primary",
};

export const reviewRouteFor = (type) =>
  type === "video" ? "/videoreview" : "/textreview";

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
    <div className="card task-card mb-3">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <h5 className="fw-bold mb-1">{task.title}</h5>

            {task.source && (
              <div
                className="small text-muted"
                style={{
                  padding: "2px 6px",
                  borderRadius: "6px",
                }}
              >
                {task.source}
              </div>
            )}
          </div>

          <span className="auth-link-text-only small">
            {task.format.toUpperCase()}
          </span>
        </div>

        <p className="small task-description mb-2">{task.description}</p>

        <div className="small fst-italic task-reason mb-3">{task.why_this}</div>

        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
          <span className="small text-muted fw-semibold">
            ~{task.estimated_time_minutes} min
          </span>

          <div className="d-flex align-items-center gap-3">
            {task.url && (
              <a
                href={task.url}
                target="_blank"
                rel="noreferrer"
                className="auth-link small"
              >
                Open ↗
              </a>
            )}

            <button
              type="button"
              onClick={handleReview}
              className="auth-link small border-0 bg-transparent p-0"
            >
              Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DayBlock = ({ day, tasks, planId }) => (
  <div className="mb-4">
    <div className="d-flex align-items-center gap-2 mb-3">
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "999px",
          background: "#9f46ed",
        }}
      />
      <h4 className="fw-bold mb-0">Day {day}</h4>
    </div>

    {tasks.map((t, i) => (
      <TaskCard
        key={`${t.title}-${i}`}
        task={t}
        planId={planId}
        taskIndex={i}
      />
    ))}
  </div>
);

export const VideoCard = ({ v, onReview }) => (
  <div className="card task-card h-100 overflow-hidden">
    <a href={v.embedUrl} target="_blank" rel="noreferrer">
      {v.thumbnail && (
        <img
          src={v.thumbnail}
          alt={v.title}
          className="card-img-top"
          style={{
            height: "180px",
            objectFit: "cover",
          }}
        />
      )}
    </a>

    <div className="card-body p-3">
      <div className="fw-semibold mb-2">{v.title}</div>

      <div className="d-flex justify-content-end">
        <button
          type="button"
          onClick={onReview}
          className="auth-link border-0 bg-transparent p-0 small"
        >
          Review
        </button>
      </div>
    </div>
  </div>
);

export const SimpleListItem = ({ title, subtitle, href, onReview }) => (
  <div className="card task-card mb-2">
    <div className="card-body py-3 px-4">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div className="flex-grow-1">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-decoration-none text-reset"
            >
              <div className="fw-semibold">{title}</div>

              {subtitle && (
                <div className="small text-muted mt-1">{subtitle}</div>
              )}
            </a>
          ) : (
            <>
              <div className="fw-semibold">{title}</div>

              {subtitle && (
                <div className="small text-muted mt-1">{subtitle}</div>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onReview}
          className="auth-link border-0 bg-transparent p-0 small"
        >
          Review
        </button>
      </div>
    </div>
  </div>
);

export const PlanView = () => {
  const location = useLocation();
  const navigateRouter = useNavigate();

  const [data, setData] = useState(
    () => location.state?.plan ?? loadCachedPlan(),
  );

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (location.state?.plan) {
      setData(location.state.plan);
      return;
    }

    if (data) return;

    let cancelled = false;

    setLoading(true);

    fetch(`${API_URL}/plan`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (cancelled) return;

        if (response.ok) {
          const json = await response.json();

          setData(json);

          try {
            localStorage.setItem("currentPlan", JSON.stringify(json));
          } catch {
            //
          }

          return;
        }

        if (response.status === 401 || response.status === 404) {
          return;
        }

        const json = await response.json().catch(() => ({}));

        setFetchError(
          json.message ?? `Failed to load plan (${response.status})`,
        );
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
      <div className="container py-5">
        <div className="card modern-card p-5 text-center">
          <div className="text-muted">Loading your learning plan…</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-5">
        <div
          className="card modern-card p-5 text-center mx-auto"
          style={{ maxWidth: "500px" }}
        >
          <h3 className="fw-bold mb-3">No plan yet</h3>

          <p className="text-muted mb-4">
            Fill out the onboarding form to generate your personalized learning
            journey.
          </p>

          {fetchError && (
            <div className="alert alert-warning small">{fetchError}</div>
          )}

          <Link to="/learningform" className="btn purple-btn px-4 py-2">
            Create my plan
          </Link>
        </div>
      </div>
    );
  }

  const { validation, plan, materials, planId } = data;

  const status = data.status ?? "accepted";

  const goReview = (route, material) =>
    navigateRouter(route, {
      state: {
        material: {
          ...material,
          planId: planId ?? null,
        },
      },
    });

  if (!validation?.accepted || !plan) {
    return (
      <div className="container py-5">
        <div
          className="card modern-card p-5 mx-auto"
          style={{ maxWidth: "650px" }}
        >
          <h3 className="fw-bold text-warning mb-3">We can't plan this goal</h3>

          <p className="text-muted">
            {validation?.rejection_reason ??
              "Please try another learning goal."}
          </p>

          <Link to="/learningform" className="btn purple-btn mt-3">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card modern-card p-4 mb-4">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <div className="small purple-text fw-semibold mb-2">
                  WEEKLY FOCUS
                </div>

                <h2 className="fw-bold mb-2">{plan.weekly_focus}</h2>

                <p className="section-subtitle mb-0">{plan.topic_summary}</p>
              </div>

              <span
                className={`badge custom-badge ${
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

            <div className="small text-muted">
              ~{plan.daily_time_minutes} minutes/day · {plan.tasks.length} tasks
            </div>
          </div>

          {Object.keys(tasksByDay)
            .map(Number)
            .sort((a, b) => a - b)
            .map((day) => (
              <DayBlock
                key={day}
                day={day}
                tasks={tasksByDay[day]}
                planId={planId}
              />
            ))}

          <div className="d-flex gap-3 flex-wrap mt-4">
            <Link to="/learningform" className="btn purple-outline-btn">
              Generate new plan
            </Link>

            <Link to="/conversation" className="btn purple-btn">
              Talk to tutor
            </Link>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card modern-card p-4 materials-panel">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <div className="small purple-text fw-semibold">MATERIALS</div>

                <h4 className="fw-bold mb-0">Recommended resources</h4>
              </div>
            </div>

            {materials?.videos?.length > 0 && (
              <>
                <h6 className="text-muted text-uppercase small mb-3">Videos</h6>

                <div className="row g-3 mb-4">
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
                <h6 className="text-muted text-uppercase small mb-3">Books</h6>

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
                <h6 className="text-muted text-uppercase small mb-3 mt-4">
                  Academic Papers
                </h6>

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanView;
