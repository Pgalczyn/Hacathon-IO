import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./index.css";

const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
};

const formatTimeDedication = (minutes) => {
  if (!minutes) return "Not set";
  if (minutes < 60) return `${minutes} minutes daily`;
  const hours = (minutes / 60).toFixed(1);
  return `${hours} hours daily`;
};

const formatFormats = (formats) => {
  if (!formats || formats.length === 0) return "None";
  return formats.map((f) => capitalize(f)).join(", ");
};

const MyProfile = () => {
  // --- Data States ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Edit Modal States ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", surname: "", dateOfBirth: "" });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("http://localhost:3000/user/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!response.ok) throw new Error("Not logged in");
        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // --- Modal Handlers ---
  const openEditModal = () => {
    // Pre-fill form and format date for the HTML input (YYYY-MM-DD)
    const dob = user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "";
    setFormData({ name: user.name, surname: user.surname, dateOfBirth: dob });
    setEditError("");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError("");

    try {
      const response = await fetch("http://localhost:3000/user/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const updatedUser = await response.json();

      // Update the local user state so the UI reflects changes instantly
      setUser((prevUser) => ({ ...prevUser, ...updatedUser }));
      closeEditModal();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="auth-switch"><p>Loading profile...</p></div>;
  }

  if (error || !user) {
    return (
        <div className="auth-switch">
          <p>
            You are not logged in. <Link to="/login">Login</Link> or{" "}
            <Link to="/addUser">Register here</Link>
          </p>
        </div>
    );
  }

  return (
      <div className="auth-switch">
        <div className="profile-card">
          {/* ---------- Header ---------- */}
          <div className="profile-header">
            <div className="profile-avatar">
              {user.name?.[0]}
              {user.surname?.[0]}
            </div>
            <h2>{user.login}</h2>
            <p className="profile-email">{user.email}</p>
            <span className="profile-status">Verified Member</span>
          </div>

          {/* ---------- Personal Info Section ---------- */}
          <div className="profile-section">
            <h3>Personal Info</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Full Name</label>
                <p>{user.name} {user.surname}</p>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <p>{user.email}</p>
              </div>
              <div className="detail-item">
                <label>Date of Birth</label>
                <p>{new Date(user.dateOfBirth).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* ---------- Learning Statistics Section ---------- */}
          {user.statistics && (
              <div className="profile-section">
                <h3>Learning Stats</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Completed Weeks</label>
                    <p>{user.statistics.completedWeeks}</p>
                  </div>
                  <div className="detail-item">
                    <label>Materials Reviewed</label>
                    <p>{user.statistics.totalReviews}</p>
                  </div>
                  <div className="detail-item">
                    <label>Quizzes Taken</label>
                    <p>{user.statistics.quizzesTaken}</p>
                  </div>
                  <div className="detail-item">
                    <label>Avg. Quiz Score</label>
                    <p>{user.statistics.averageQuizScore}%</p>
                  </div>
                </div>
              </div>
          )}

          {/* ---------- Learning Preferences Section ---------- */}
          <div className="profile-section">
            <h3>Learning Preferences</h3>
            {user.preferences ? (
                <div className="preferences-grid">
                  <div className="pref-item">
                    <span className="pref-label">Skill Level</span>
                    <span>{capitalize(user.preferences.skillLevel)}</span>
                  </div>
                  <div className="pref-item">
                    <span className="pref-label">Topics</span>
                    <span>{user.preferences.topics || "Not set"}</span>
                  </div>
                  <div className="pref-item">
                    <span className="pref-label">Time Dedication</span>
                    <span>{formatTimeDedication(user.preferences.dailyMinutes)}</span>
                  </div>
                  <div className="pref-item">
                    <span className="pref-label">Preferred Formats</span>
                    <span>{formatFormats(user.preferences.preferredFormats)}</span>
                  </div>
                  <div className="pref-item">
                    <span className="pref-label">Community</span>
                    <span>
                  {user.preferences.wantsCommunity
                      ? "Wants to connect with others"
                      : "Prefers solo learning"}
                </span>
                  </div>
                </div>
            ) : (
                <p style={{ color: "gray", fontStyle: "italic" }}>
                  No learning plan set up yet. Go to onboarding to generate one!
                </p>
            )}
          </div>

          {/* ---------- Edit Button ---------- */}
          <button className="edit-profile-btn" onClick={openEditModal}>
            Edit Profile
          </button>
        </div>

        {/* ---------- EDIT PROFILE POPUP (MODAL) ---------- */}
        {isEditModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Edit Profile</h3>
                {editError && <p className="modal-error">{editError}</p>}

                <form onSubmit={handleSaveProfile} className="modal-form">
                  <div className="modal-field">
                    <label>First Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        required
                    />
                  </div>

                  <div className="modal-field">
                    <label>Last Name</label>
                    <input
                        type="text"
                        name="surname"
                        value={formData.surname}
                        onChange={handleFormChange}
                        required
                    />
                  </div>

                  <div className="modal-field">
                    <label>Date of Birth</label>
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleFormChange}
                        required
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={closeEditModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-save" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
};

export default MyProfile;