import "./index.css";
import DayView from "./DayView";
import RecommendedMaterials from "./RecommendedMaterials";

const Home = () => {
  return (
    <div className="home-page">
      {/* HERO */}
      <header className="home-hero">
        <div className="home-hero-content">
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
      <main className="home-main">
        <section className="home-section">
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
