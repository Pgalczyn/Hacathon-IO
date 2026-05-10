import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import WelcomeStartCard from "./WelcomeStartCard.jsx";
import "./index.css";

import API_URL from "../api.js";

const MessageBubble = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div
      className={`d-flex mb-2 ${isUser ? "justify-content-end" : "justify-content-start"}`}
    >
      <div
        className="px-3 py-2 shadow-sm"
        style={{
          maxWidth: "78%",
          borderRadius: "16px",
          background: isUser ? "var(--purple, #6f42c1)" : "white",
          color: isUser ? "white" : "inherit",
          border: isUser ? "none" : "1px solid #e9ecef",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content}
      </div>
    </div>
  );
};

const Conversation = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [convo, setConvo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [noPlan, setNoPlan] = useState(false);
  const scrollRef = useRef(null);

  // Gate on weekly plan: tutoring needs a plan to discuss. If none yet,
  // render the same Welcome CTA as Home / Learning / Summary.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/plan`, { credentials: "include" })
      .then((r) => {
        if (cancelled) return;
        if (r.status === 404) setNoPlan(true);
      })
      .catch(() => { /* fall through to existing flow */ });
    return () => { cancelled = true; };
  }, []);

  // Initial load: existing conversation by id, or render empty state with start button
  useEffect(() => {
    let cancelled = false;
    if (!routeId) {
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    fetch(`${API_URL}/conversation/${routeId}`, { credentials: "include" })
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
        setConvo(j);
      })
      .catch((e) => !cancelled && setError(e.message || "Network error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convo?.messages?.length]);

  const handleStart = async () => {
    setError("");
    setStarting(true);
    try {
      const r = await fetch(`${API_URL}/conversation`, {
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
      setConvo(j);
      navigate(`/conversation/${j._id}`, { replace: true });
    } catch (e) {
      setError(e.message || "Network error");
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !convo?._id) return;

    // Optimistic UI: append user message immediately
    setConvo((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              { role: "user", content, createdAt: new Date().toISOString() },
            ],
          }
        : prev,
    );
    setInput("");
    setError("");
    setSending(true);

    try {
      const r = await fetch(`${API_URL}/conversation/${convo._id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.message || `Failed (${r.status})`);
        return;
      }
      setConvo(j);
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setSending(false);
    }
  };

  if (noPlan) {
    return <WelcomeStartCard />;
  }

  if (unauthorized) {
    return (
      <div className="container py-4">
        <div
          className="card shadow-sm p-4 text-center mx-auto"
          style={{ maxWidth: "480px", borderRadius: "16px" }}
        >
          <h3 className="fw-bold mb-3">Talk to your tutor</h3>
          <p className="text-muted">
            Sign in to chat with the AI tutor about your plan.
          </p>
          <Link to="/login" className="btn purple-btn btn-lg">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-4 text-muted">Loading conversation…</div>
    );
  }

  if (!convo) {
    return (
      <div className="container py-4">
        <div
          className="card shadow-sm p-4 text-center mx-auto"
          style={{ maxWidth: "560px", borderRadius: "16px" }}
        >
          <h3 className="fw-bold mb-2">Talk to your tutor</h3>
          <p className="text-muted">
            Have an open conversation about your latest plan. The AI tutor will
            ask questions to check your understanding.
          </p>
          {error && <div className="alert alert-danger small">{error}</div>}
          <button
            className="btn purple-btn btn-lg"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? "Starting…" : "Start a conversation"}
          </button>
          <div className="mt-3 small">
            <Link to="/plan">Back to plan</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div
        className="card shadow-sm mb-3"
        style={{ borderRadius: "16px", maxWidth: "780px", margin: "0 auto" }}
      >
        <div className="card-body p-3 border-bottom">
          <div className="fw-semibold">{convo.weeklyFocus}</div>
          <div className="small text-muted">{convo.topicSummary}</div>
        </div>

        <div
          ref={scrollRef}
          className="p-3"
          style={{
            height: "55vh",
            overflowY: "auto",
            background: "#f8f9fa",
          }}
        >
          {convo.messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {sending && (
            <div className="d-flex justify-content-start mb-2">
              <div
                className="px-3 py-2 shadow-sm text-muted small fst-italic"
                style={{
                  borderRadius: "16px",
                  background: "white",
                  border: "1px solid #e9ecef",
                }}
              >
                tutor is thinking…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-top d-flex gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Type your answer or question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="btn purple-btn"
            disabled={sending || input.trim().length === 0}
          >
            Send
          </button>
        </form>

        {error && (
          <div className="alert alert-danger small m-3 mb-0">{error}</div>
        )}
      </div>

      <div className="text-center small">
        <Link to="/plan" className="auth-link">
          Back to plan
        </Link>
      </div>
    </div>
  );
};

export default Conversation;
