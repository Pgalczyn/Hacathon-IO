import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";

const API_URL = "http://localhost:3000";

const LEVEL_OPTIONS = [
  { value: "complete_beginner", label: "I'm new — show me the basics" },
  { value: "beginner", label: "I know the names; I want a clean foundation" },
  { value: "intermediate", label: "I've used it; I want to level up" },
  { value: "advanced", label: "I'm experienced; show me deep / cutting-edge content" },
];

const METHODS = [
  { key: "video", label: "Videos / YouTube" },
  { key: "article", label: "Articles / Blogs" },
  { key: "book", label: "Books / E-books" },
  { key: "course", label: "Online Courses" },
  { key: "podcast", label: "Podcasts / Interviews" },
  { key: "community", label: "Community / Forums" },
];

const TIME_BUCKETS = [
  { label: "15-30 minutes", minutes: 22 },
  { label: "30-60 minutes", minutes: 45 },
  { label: "1-2 hours", minutes: 90 },
  { label: "2+ hours", minutes: 150 },
];

const LearningForm = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [rejection, setRejection] = useState(null);
  const [formData, setFormData] = useState({
    goal: "",
    level: "",
    timeBucketIndex: 1,
    methods: [],
    connectWithOthers: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const toggleMethod = (key) => {
    setFormData((prev) => ({
      ...prev,
      methods: prev.methods.includes(key)
        ? prev.methods.filter((m) => m !== key)
        : [...prev.methods, key],
    }));
  };

  const validate = () => {
    if (formData.goal.length < 20) return "Goal description must be at least 20 characters long.";
    if (formData.goal.length > 1000) return "Goal description must be at most 1000 characters long.";
    if (!formData.level) return "Please pick your current level.";
    if (formData.methods.length === 0) return "Pick at least one preferred learning format.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setRejection(null);

    const validationError = validate();
    if (validationError) {
      setServerError(validationError);
      return;
    }

    const payload = {
      goalText: formData.goal,
      currentLevel: formData.level,
      dailyMinutes: TIME_BUCKETS[formData.timeBucketIndex].minutes,
      preferredFormats: formData.methods,
      wantsCommunity: formData.connectWithOthers,
    };

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.status === 422 && data.validation && !data.validation.accepted) {
        setRejection(data.validation);
        return;
      }
      if (!response.ok) {
        setServerError(data.message || data.error || `Request failed with status ${response.status}`);
        return;
      }

      try {
        localStorage.setItem("currentPlan", JSON.stringify(data));
      } catch {
        // ignore quota / disabled storage
      }
      navigate("/plan", { state: { plan: data } });
    } catch (err) {
      setServerError(err.message || "Network error — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-start w-100 py-4 bg-light">
      <div
        className="card shadow-sm p-4 w-100"
        style={{ maxWidth: "560px", borderRadius: "16px" }}
      >
        <h2 className="text-center mb-4 fw-bold">Learning Goals</h2>

        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="form-label">What do you want to learn? (20-1000 chars)</label>
            <textarea
              name="goal"
              placeholder="e.g., I want to learn Python and build web applications"
              value={formData.goal}
              onChange={handleInputChange}
              className="form-control"
              rows={3}
              required
            />
            <small className="text-muted">{formData.goal.length}/1000 characters</small>
          </div>

          <div>
            <label className="form-label fw-semibold">Your current level</label>
            <div className="d-grid gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <div key={opt.value} className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="level"
                    id={`level-${opt.value}`}
                    value={opt.value}
                    checked={formData.level === opt.value}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label" htmlFor={`level-${opt.value}`}>
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">How much time can you dedicate daily?</label>
            <input
              type="range"
              name="timeBucketIndex"
              className="form-range custom-range"
              min="0"
              max="3"
              step="1"
              value={formData.timeBucketIndex}
              onChange={(e) =>
                setFormData({ ...formData, timeBucketIndex: Number(e.target.value) })
              }
            />
            <div className="text-center fw-semibold purple-text">
              {TIME_BUCKETS[formData.timeBucketIndex].label}
            </div>
          </div>

          <div>
            <label className="form-label fw-semibold">Preferred learning methods</label>
            <div className="d-grid gap-2">
              {METHODS.map((m) => (
                <div key={m.key} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`method-${m.key}`}
                    checked={formData.methods.includes(m.key)}
                    onChange={() => toggleMethod(m.key)}
                  />
                  <label className="form-check-label" htmlFor={`method-${m.key}`}>
                    {m.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="connectWithOthers"
              checked={formData.connectWithOthers}
              onChange={(e) =>
                setFormData({ ...formData, connectWithOthers: e.target.checked })
              }
            />
            <label className="form-check-label" htmlFor="connectWithOthers">
              I want to connect with other learners
            </label>
          </div>

          {serverError && (
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {serverError}
            </div>
          )}

          {rejection && (
            <div className="alert alert-warning py-2 mb-0" role="alert">
              <strong>We can't plan this goal.</strong>
              <div className="small">{rejection.rejection_reason}</div>
              {rejection.rejection_category && (
                <div className="small text-muted">
                  Category: {rejection.rejection_category}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn purple-btn btn-lg px-4"
            disabled={submitting}
          >
            {submitting ? "Generating plan…" : "Generate my plan"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LearningForm;
