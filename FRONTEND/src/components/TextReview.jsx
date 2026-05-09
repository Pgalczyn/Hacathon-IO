import React, { useState } from 'react';
import "./index.css";
const TextReview = ({ onFinish }) => {
    const [rating, setRating] = useState(0);

    return (
        <div className="review-card">
            <h3>Material Review - Text</h3>
            <p><strong>Python for Beginners - Variables and Types</strong></p>

            <form onSubmit={(e) => { e.preventDefault(); onFinish(); }}>
                {/* Rating 1-5 */}
                <div className="review-section">
                    <label>How do you rate this resource? (1-5)</label>
                    <div className="star-rating">
                        {[1, 2, 3, 4, 5].map(num => (
                            <label key={num}>
                                <input type="radio" name="rating" value={num} onClick={() => setRating(num)} />
                                {num} ⭐
                            </label>
                        ))}
                    </div>
                </div>

                <div className="review-section">
                    <label>Was it helpful?</label>
                    <select required className="form-select">
                        <option value="">Select an option...</option>
                        <option>Yes, very helpful</option>
                        <option>It was okay, I learned something</option>
                        <option>Not very useful</option>
                        <option>No, waste of time</option>
                    </select>
                </div>

                <div className="review-section">
                    <label>Difficulty level</label>
                    <div className="radio-group-horizontal">
                        {['Too easy', 'Just right', 'Too difficult'].map(level => (
                            <label key={level}>
                                <input type="radio" name="difficulty" value={level} required /> {level}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="review-section">
                    <label>What was the best part? (optional)</label>
                    <textarea placeholder="Tell us more..."></textarea>
                </div>

                <button type="submit" className="btn purple-btn w-100">Submit Review</button>
            </form>
        </div>
    );
};

const LearningText = () => {
    const [completed, setCompleted] = useState(false);

    return (
        <div className="container mt-5">
            {!completed ? (
                <div className="text-center">
                    <h2 className="mb-4">Python for Beginners - Variables and Types</h2>

                    <div className="article-preview-card my-4 shadow-sm">
                        <div className="card-content">
                            <a
                                href="https://www.w3schools.com/java/java_oop.asp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-primary"
                            >
                                Open Article in New Tab
                            </a>
                        </div>
                    </div>
                    <button
                        className="btn btn-success btn-lg px-5"
                        onClick={() => setCompleted(true)}
                    >
                        Mark as Completed & Review
                    </button>
                </div>
            ) : (
                <div className="fade-in">
                    <TextReview onFinish={() => alert("Thank you for your feedback!")} />
                </div>
            )}
        </div>
    );
};

export default LearningText;