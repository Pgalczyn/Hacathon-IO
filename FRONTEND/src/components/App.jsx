
import {AuthProvider} from "./AuthContext.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./Navbar";
import Login from "./Login";
import Home from "./Home";
import Register from "./Register";
import Learning from "./Learning";
import LearningForm from "./LearningForm.jsx";
import VideoReview from "./VideoReview";
import TextReview from "./TextReview.jsx";
import WeeklySummary from "./WeeklySummary.jsx";
// import "./App.css";
import MyProfile from "./MyProfile.jsx";
import "./index.css";

function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
          <div className="d-flex flex-column vh-100">
            <Navbar />
            <div className="flex-grow-1 d-flex">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/learning" element={<Learning />} />
                <Route path="/learningform" element={<LearningForm />} />
                <Route path="/myprofile" element={<MyProfile />} />
                <Route path="/videoreview" element={<VideoReview />} />
                <Route path="/textreview" element={<TextReview />} />
                <Route path="/weeklysummary" element={<WeeklySummary />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
  );
}

export default App;
