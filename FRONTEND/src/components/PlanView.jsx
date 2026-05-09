import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

function loadCachedPlan() {
  try {
    const raw = localStorage.getItem("currentPlan");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const TaskCard = ({ task }) => (
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
        {task.url && (
          <a href={task.url} target="_blank" rel="noreferrer" className="small">
            open ↗
          </a>
        )}
      </div>
    </div>
  </div>
);

const DayBlock = ({ day, tasks }) => (
  <div className="mb-3">
    <h5 className="fw-bold mb-2">Day {day}</h5>
    {tasks.map((t, i) => (
      <TaskCard key={`${t.title}-${i}`} task={t} />
    ))}
  </div>
);

const VideoCard = ({ v }) => (
  <a
    href={v.embedUrl}
    target="_blank"
    rel="noreferrer"
    className="text-decoration-none text-reset"
  >
    <div className="card shadow-sm h-100" style={{ borderRadius: "12px" }}>
      {v.thumbnail && (
        <img
          src={v.thumbnail}
          alt={v.title}
          className="card-img-top"
          style={{ borderTopLeftRadius: "12px", borderTopRightRadius: "12px" }}
        />
      )}
      <div className="card-body py-2 px-3">
        <div className="small fw-semibold">{v.title}</div>
      </div>
    </div>
  </a>
);

const SimpleListItem = ({ title, subtitle, href }) => {
  const content = (
    <div className="card mb-2 shadow-sm" style={{ borderRadius: "12px" }}>
      <div className="card-body py-2 px-3">
        <div className="fw-semibold small">{title}</div>
        {subtitle && <div className="small text-muted">{subtitle}</div>}
      </div>
    </div>
  );
  if (!href) return content;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-decoration-none text-reset">
      {content}
    </a>
  );
};

const PlanView = () => {
  const location = useLocation();
  const [data, setData] = useState(() => location.state?.plan ?? loadCachedPlan());
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

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

  const { validation, plan, materials } = data;

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
            <h3 className="fw-bold mb-1">{plan.weekly_focus}</h3>
            <p className="text-muted">{plan.topic_summary}</p>
            <div className="small text-muted">
              ~{plan.daily_time_minutes} minutes per day · {plan.tasks.length} tasks
            </div>
          </div>

          {Object.keys(tasksByDay)
            .map(Number)
            .sort((a, b) => a - b)
            .map((day) => (
              <DayBlock key={day} day={day} tasks={tasksByDay[day]} />
            ))}

          <Link to="/learningform" className="btn btn-outline-secondary mt-2">
            Generate a new plan
          </Link>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm p-4 mb-3" style={{ borderRadius: "16px" }}>
            <h5 className="fw-bold mb-3">Real materials we found</h5>

            {materials?.videos?.length > 0 && (
              <>
                <h6 className="text-muted text-uppercase small mt-2">Videos</h6>
                <div className="row g-2">
                  {materials.videos.map((v) => (
                    <div key={v.videoId} className="col-12">
                      <VideoCard v={v} />
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
