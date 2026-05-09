import React, { useState } from "react";
// import "./LearningForm.css";
import "./index.css";

const LearningForm = () => {
  const [formData, setFormData] = useState({
    goal: "",
    level: "",
    timeSpent: 0,
    methods: [],
    connectWithOthers: false,
  });

  const methodsOptions = [
    "Videos/YouTube",
    "Articles/Blogs",
    "Books/E-books",
    "Online Courses",
    "Podcasts/Interviews",
    "Community/Forums",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (method) => {
    const updatedMethods = formData.methods.includes(method)
      ? formData.methods.filter((m) => m !== method)
      : [...formData.methods, method];
    setFormData({ ...formData, methods: updatedMethods });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.goal.length < 20) {
      alert("Goal description must be at least 20 characters long!");
      return;
    } else if (formData.goal.length > 1000) {
      alert("Goal description must be maximum 1000 characters long!");
      return;
    }
    console.log("Collected Data:", formData);
    alert("Form submitted! Check the console.");
  };

  return (
    <div className="d-flex justify-content-center align-items-center w-100 h-100 bg-light">
      <div
        className="card shadow-sm p-4 w-100"
        style={{ maxWidth: "450px", borderRadius: "16px" }}
      >
        <h2 className="text-center mb-4 fw-bold">Learning Goals</h2>

        <form className="d-flex flex-column gap-3" onSubmit={handleSubmit}>
          {/* What do you want to learn? */}
          <label>What do you want to learn? (20-1000 char.)</label>
          <textarea
            name="goal"
            placeholder="e.g., I want to learn Python and build web applications"
            value={formData.goal}
            onChange={handleInputChange}
            className="form-control"
            required
          />
          <small>{formData.goal.length}/1000 characters</small>

          {/* What do you want to learn? */}
          <label>Describe your current skill level</label>
          <textarea
            name="level"
            placeholder="e.g., I only know print('Hello World') "
            value={formData.level}
            onChange={handleInputChange}
            required
            className="form-control"
          />
          <small>{formData.level.length}/1000 characters</small>

          {/* Time per day */}
          <label>How much time can you dedicate daily?</label>
          <input
            type="range"
            name="form-range"
            className="form-range custom-range"
            min="0"
            max="3"
            step="1"
            value={formData.timeSpent}
            onChange={(e) =>
              setFormData({ ...formData, timeSpent: Number(e.target.value) })
            }
          />
          <div className="text-center fw-semibold purple-text">
            {
              ["15-30 minutes", "30-60 minutes", "1-2 hours", "2+ hours"][
                formData.timeSpent
              ]
            }
          </div>

          {/* Learning methods */}
          <div className="form-section">
            <label className="fw-semibold">Preferred learning methods:</label>

            <div className="d-grid gap-2">
              {methodsOptions.map((method) => (
                <div key={method} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={formData.methods.includes(method)}
                    onChange={() => handleCheckboxChange(method)}
                    id={method}
                  />
                  <label className="form-check-label" htmlFor={method}>
                    {method}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Connecting with others */}
          <div className="form-section">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                name="connectWithOthers"
                checked={formData.connectWithOthers}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    connectWithOthers: e.target.checked,
                  })
                }
                id="connectWithOthers"
              />

              <label className="form-check-label" htmlFor="connectWithOthers">
                I want to connect with other participants
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn purple-btn btn-lg px-4"
            // disabled={formData.goal.length < 20}
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default LearningForm;
