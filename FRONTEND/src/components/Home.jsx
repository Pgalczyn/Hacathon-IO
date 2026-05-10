import "./index.css";
import DayView from "./DayView";
import RecommendedMaterials from "./RecommendedMaterials";
import welcomeButton from "./assets/welcome_button.png";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

const Home = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="text-center py-5">Loading...</div>;
  }

  if (!user) {
    return (
      <>
        {/* <header className="d-flex flex-column align-items-center py-5"> */}
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

          {/* decorative glows */}
          <div className="home-glow home-glow-right" />
          <div className="home-glow home-glow-left" />
          {/* </header> */}
        </header>
      </>
    );
  }

  return (
    <div className="home-page">
      {/* HERO */}
      <header className="home-hero">
        <div className="home-hero-content text-center py-5 text-white">
          <h1>Your Learning Plan</h1>
          <p>
            Stay consistent with your daily tasks and explore curated materials
            tailored to your goals.
          </p>
        </div>

        {/* decorative glows */}
        <div className="home-glow home-glow-right" />
        <div className="home-glow home-glow-left" />
      </header>

      {/* CONTENT */}
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
