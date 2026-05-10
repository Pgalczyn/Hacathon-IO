import "./index.css";
import { useEffect, useState } from "react";
import DayView from "./DayView";
import RecommendedMaterials from "./RecommendedMaterials";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

const API_URL = "http://localhost:3000";

const Home = () => {
  const { user, loading } = useAuth();
  const [planStatus, setPlanStatus] = useState("checking"); // checking | none | ready

  // When the user is logged in, ask the API whether they actually have a plan.
  // localStorage alone is unreliable: a freshly-registered user can inherit a
  // stale `currentPlan` from an earlier session on the same browser, which is
  // how "Introduction to Python" mock-looking data showed up on a brand-new
  // account. The DB is source-of-truth.
  useEffect(() => {
    if (!user) {
      setPlanStatus("checking");
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/plan`, { credentials: "include" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          try { localStorage.removeItem("currentPlan"); } catch { /* ignore */ }
          setPlanStatus("none");
          return;
        }
        if (r.ok) {
          const json = await r.json();
          try { localStorage.setItem("currentPlan", JSON.stringify(json)); } catch { /* ignore */ }
          setPlanStatus("ready");
          return;
        }
        setPlanStatus("none");
      })
      .catch(() => !cancelled && setPlanStatus("none"));
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return <div className="text-center py-5">Loading...</div>;
  }

  if (!user) {
    return (
      <>
        <header className="home-hero w-100 rounded-4">
          <div className="home-hero-content text-center py-5 text-white">
            <h1>Welcome!</h1>
            <Link to="/login" style={{ textDecoration: "none" }}>
              <p
                style={{
                  color: "rgba(255,255,255,0.8)",
                  marginTop: "15px",
                  fontWeight: 500,
                }}
              >
                Please log in to see your plans.
              </p>
            </Link>
          </div>

          <div className="home-glow home-glow-right" />
          <div className="home-glow home-glow-left" />
        </header>
      </>
    );
  }

  if (planStatus === "checking") {
    return <div className="text-center py-5 text-muted">Loading your plan…</div>;
  }

  if (planStatus === "none") {
    return (
      <div className="container py-5">
        <div
          className="card shadow-sm p-4 text-center mx-auto"
          style={{ maxWidth: "560px", borderRadius: "16px" }}
        >
          <h3 className="fw-bold mb-3">Welcome!</h3>
          <p className="text-muted mb-4">
            Tell us what you want to learn and we'll build a personalized
            weekly plan plus a 12-month roadmap on a calendar.
          </p>
          <Link to="/learningform" className="btn purple-btn btn-lg">
            Start the questionnaire
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <header className="home-hero">
        <div className="home-hero-content text-center py-5 text-white">
          <h1>Your Learning Plan</h1>
          <p>
            Stay consistent with your daily tasks and explore curated materials
            tailored to your goals.
          </p>
        </div>

        <div className="home-glow home-glow-right" />
        <div className="home-glow home-glow-left" />
      </header>

      <main className="home-main container">
        <section className="home-section mb-5">
          <DayView />
        </section>

        <section className="home-section">
          <RecommendedMaterials />
        </section>
      </main>
    </div>
  );
};

export default Home;
