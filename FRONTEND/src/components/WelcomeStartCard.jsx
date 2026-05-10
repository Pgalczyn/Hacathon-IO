import { Link } from "react-router-dom";
import "./index.css";

/** Same "fill the questionnaire first" CTA every empty page (Home,
 *  Learning, Summary, Tutor) shows when the user hasn't generated a
 *  weekly plan yet. Centralizing keeps the look consistent. */
const WelcomeStartCard = () => (
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

export default WelcomeStartCard;
