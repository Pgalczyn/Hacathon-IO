import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./index.css";

const API_URL = "http://localhost:3000";

const LEVEL_LABEL = {
  complete_beginner: "Complete beginner",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const initials = (name = "", surname = "") => `${name[0] ?? "?"}${surname[0] ?? ""}`.toUpperCase();

const MatchCard = ({ m }) => (
  <div className="card mb-3 shadow-sm" style={{ borderRadius: "12px" }}>
    <div className="card-body">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div className="d-flex gap-3 align-items-start flex-grow-1">
          <div
            className="d-flex justify-content-center align-items-center fw-bold text-white flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--purple, #6f42c1)",
            }}
          >
            {initials(m.name, m.surname)}
          </div>
          <div>
            <div className="fw-semibold">
              {m.name} {m.surname}{" "}
              <span className="text-muted small">@{m.login}</span>
            </div>
            <div className="small text-muted">
              {LEVEL_LABEL[m.currentLevel] ?? m.currentLevel}
            </div>
            <div className="small mt-2">
              <span className="text-muted">Working on:</span> {m.planTopic}
            </div>
            <div className="small text-muted fst-italic">
              This week: {m.weeklyFocus}
            </div>
            {m.sharedKeywords?.length > 0 && (
              <div className="mt-2">
                {m.sharedKeywords.map((k) => (
                  <span key={k} className="badge bg-light text-dark me-1 mb-1">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-end flex-shrink-0">
          <div className="fw-bold">{Math.round(m.similarity * 100)}%</div>
          <div className="small text-muted">match</div>
        </div>
      </div>
    </div>
  </div>
);

const Match = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/match`, { credentials: "include" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) {
          setUnauthorized(true);
          return;
        }
        const j = await r.json();
        if (!r.ok) {
          setError(j.message || `Failed (${r.status})`);
          return;
        }
        setMatches(j.matches ?? []);
      })
      .catch((e) => !cancelled && setError(e.message || "Network error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (unauthorized) {
    return (
      <div className="container py-4">
        <div className="card shadow-sm p-4 text-center mx-auto" style={{ maxWidth: "480px", borderRadius: "16px" }}>
          <h3 className="fw-bold mb-3">Find learners like you</h3>
          <p className="text-muted">
            Sign in to see other learners with similar goals.
          </p>
          <Link to="/login" className="btn purple-btn btn-lg">Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="card shadow-sm p-4 mb-3" style={{ borderRadius: "16px" }}>
        <h3 className="fw-bold mb-1">Learners working on similar things</h3>
        <p className="text-muted mb-0 small">
          Matched on the keywords from your most recent learning plan.
          Only shows people who opted in to community matching.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading && <div className="text-muted">Looking for matches…</div>}

      {!loading && matches.length === 0 && !error && (
        <div className="card shadow-sm p-4 text-center" style={{ borderRadius: "16px" }}>
          <p className="text-muted mb-2">
            No matches yet. Either nobody else has opted in, or no plan
            overlaps enough with yours.
          </p>
          <p className="small text-muted">
            <Link to="/learningform">Generate a plan</Link> if you don't have one yet,
            or check back later as more people sign up.
          </p>
        </div>
      )}

      {matches.map((m) => (
        <MatchCard key={m.userId} m={m} />
      ))}
    </div>
  );
};

export default Match;
