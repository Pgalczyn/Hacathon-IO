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
            <div className="main-wrapper w-100" style={{ minHeight: "auto", display: "block" }}>
                <header className="d-flex flex-column align-items-center py-5">
                    <img
                        src={welcomeButton}
                        style={{
                            borderRadius: "20px",
                            width: "500px",
                            height: "auto",
                            display: "block"
                        }}
                        alt="Welcome"
                    />
                    <Link to="/login" style={{ textDecoration: "none" }}>
                        <p style={{
                            color: "#6f42c1",
                            marginTop: "15px",
                            fontWeight: "bold",
                            cursor: "pointer"
                        }}>
                            Please log in to see your plans.
                        </p>
                    </Link>
                </header>
            </div>
        );
    }

    return (
        <div className="home-page">
            {/* HERO */}
            <header className="home-hero">
                <div className="home-hero-content text-center py-5 bg-purple text-white">
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