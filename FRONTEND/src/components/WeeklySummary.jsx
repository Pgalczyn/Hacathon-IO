import React, { useState } from "react";

const WeeklySummary = ({ onFinish }) => {
    const [difficultyChoice, setDifficultyChoice] = useState("");
    const [methods, setMethods] = useState([]);

    const handleCheckboxChange = (method) => {
        if (methods.includes(method)) {
            setMethods(methods.filter(m => m !== method));
        } else {
            setMethods([...methods, method]);
        }
    };

    return (
        <div className="review-card">
            <h3>Weekly summary</h3>

            <form onSubmit={(e) => { e.preventDefault(); onFinish(); }}>

                <div className="review-section">
                    <label><strong>Do you want more materials at the same difficulty level?</strong></label>
                    <div className="radio-group-vertical">
                        {[
                            "Yes, continue at this level",
                            "Increase difficulty",
                            "Change topic"
                        ].map((option) => (
                            <label key={option} className="d-block">
                                <input
                                    type="radio"
                                    name="difficultyLevel"
                                    value={option}
                                    required
                                    onChange={(e) => setDifficultyChoice(e.target.value)}
                                /> {option}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="review-section">
                    <label><strong>Which learning methods worked best for you?</strong> (check multiple)</label>
                    <div className="checkbox-group">
                        {[
                            "Videos",
                            "Articles",
                            "Books",
                            "Courses",
                            "Podcasts",
                            "Community"
                        ].map((method) => (
                            <label key={method} className="d-block">
                                <input
                                    type="checkbox"
                                    value={method}
                                    checked={methods.includes(method)}
                                    onChange={() => handleCheckboxChange(method)}
                                /> {method}
                            </label>
                        ))}
                    </div>
                </div>

                <button type="submit" className="btn purple-btn w-100">Submit Review</button>
            </form>
        </div>
    );
};

export default WeeklySummary;