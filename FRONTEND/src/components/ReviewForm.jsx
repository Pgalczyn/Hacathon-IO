import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./index.css";

const API_URL = "http://localhost:3000";

const HELPFUL_OPTIONS = [
  { value: "yes_very_helpful", label: "Yes, very helpful" },
  { value: "somewhat", label: "It was okay, I learned something" },
  { value: "not_very_useful", label: "Not very useful" },
  { value: "waste_of_time", label: "No, waste of time" },
];

const DIFFICULTY_OPTIONS = [
  { value: "too_easy", label: "Too easy" },
  { value: "just_right", label: "Just right" },
  { value: "too_difficult", label: "Too difficult" },
];

/**
 * Generic material review form.
 * Material data comes from the router state set by the navigator
 * (PlanView) — see /textreview and /videoreview routes.
 */
const ReviewForm = ({ defaultType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const material = location.state?.material;

  const [rating, setRating] = useState(0);
  const [helpful, setHelpful] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [bestPart, setBestPart] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!material) {
      setError("No material selected. Go back to your plan and pick one.");
      return;
    }
    if (!rating) {
      setError("Please pick a rating.");
      return;
    }
    if (!helpful || !difficulty) {
      setError("Please answer the helpful + difficulty questions.");
      return;
    }

    const payload = {
      planId: material.planId ?? null,
      materialKey: material.key,
      materialTitle: material.title,
      materialType: material.type ?? defaultType,
      materialUrl: material.url ?? null,
      rating,
      helpful,
      difficulty,
      bestPart: bestPart.trim() || null,
    };

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        setError("You need to be logged in to submit a review.");
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || data.error || `Failed (${response.status})`);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Network error — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mt-4">
        <div className="card shadow-sm p-4 text-center" style={{ maxWidth: "480px", margin: "0 auto", borderRadius: "16px" }}>
          <h4 className="text-success mb-2">Thank you for your feedback!</h4>
          <p className="text-muted">We'll use it to tune your future recommendations.</p>
          <button className="btn purple-btn mt-2" onClick={() => navigate("/plan")}>Back to plan</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="card shadow-sm p-4" style={{ maxWidth: "560px", margin: "0 auto", borderRadius: "16px" }}>
        <h3 className="fw-bold mb-1">Material Review</h3>
        {material ? (
          <>
            <p className="mb-3">
              <strong>{material.title}</strong>
              {material.source && <span className="text-muted small"> — {material.source}</span>}
            </p>
            {material.url && (
              <div className="mb-3">
                <a href={material.url} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                  Open the material ↗
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="alert alert-warning small mb-3">
            No material selected. <Link to="/plan">Pick one from your plan</Link>.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="review-section mb-3">
            <label className="form-label">How do you rate this resource? (1-5)</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((num) => (
                <label key={num} className="me-2">
                  <input
                    type="radio"
                    name="rating"
                    value={num}
                    checked={rating === num}
                    onChange={() => setRating(num)}
                  />{" "}
                  {num} ⭐
                </label>
              ))}
            </div>
          </div>

          <div className="review-section mb-3">
            <label className="form-label">Was it helpful?</label>
            <select
              required
              className="form-select"
              value={helpful}
              onChange={(e) => setHelpful(e.target.value)}
            >
              <option value="">Select an option...</option>
              {HELPFUL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="review-section mb-3">
            <label className="form-label">Difficulty level</label>
            <div className="radio-group-horizontal">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <label key={opt.value} className="me-3">
                  <input
                    type="radio"
                    name="difficulty"
                    value={opt.value}
                    checked={difficulty === opt.value}
                    onChange={() => setDifficulty(opt.value)}
                    required
                  />{" "}
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="review-section mb-3">
            <label className="form-label">What was the best part? (optional)</label>
            <textarea
              className="form-control"
              placeholder="Tell us more..."
              value={bestPart}
              onChange={(e) => setBestPart(e.target.value)}
              rows={3}
            />
          </div>

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <button type="submit" className="btn purple-btn w-100" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
