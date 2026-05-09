import React, { useState } from 'react';
import './LearningForm.css';

const LearningForm = () => {
    const [formData, setFormData] = useState({
        goal: '',
        timeSpent: '',
        methods: [],
        connectWithOthers: false
    });

    const methodsOptions = [
        'Videos/YouTube', 'Articles/Blogs', 'Books/E-books',
        'Online Courses', 'Podcasts/Interviews', 'Community/Forums'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCheckboxChange = (method) => {
        const updatedMethods = formData.methods.includes(method)
            ? formData.methods.filter(m => m !== method)
            : [...formData.methods, method];
        setFormData({ ...formData, methods: updatedMethods });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.goal.length < 20) {
            alert("Goal description must be at least 20 characters long!");
            return;
        }
        console.log("Collected Data:", formData);
        alert("Form submitted! Check the console.");
    };

    return (
        <div className="form-wrapper">
            <form className="learning-form" onSubmit={handleSubmit}>
                <h2 className="form-title">Learning Goals</h2>

                {/* What do you want to learn? */}
                <div className="form-section">
                    <label>What do you want to learn? (min. 20 chars)</label>
                    <textarea
                        name="goal"
                        placeholder="e.g., I want to learn Python and build web applications"
                        value={formData.goal}
                        onChange={handleInputChange}
                        required
                    />
                    <small>{formData.goal.length}/20 characters</small>
                </div>

                {/* Time per day */}
                <div className="form-section">
                    <label>How much time can you dedicate daily?</label>
                    <div className="radio-group">
                        {['15-30 minutes', '30-60 minutes', '1-2 hours', '2+ hours'].map(time => (
                            <label key={time} className="radio-label">
                                <input
                                    type="radio"
                                    name="timeSpent"
                                    value={time}
                                    checked={formData.timeSpent === time}
                                    onChange={handleInputChange}
                                    required
                                /> {time}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Learning methods */}
                <div className="form-section">
                    <label>Preferred learning methods:</label>
                    <div className="checkbox-grid">
                        {methodsOptions.map(method => (
                            <label key={method} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.methods.includes(method)}
                                    onChange={() => handleCheckboxChange(method)}
                                /> {method}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Connecting with others */}
                <div className="form-section">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="connectWithOthers"
                            checked={formData.connectWithOthers}
                            onChange={(e) => setFormData({...formData, connectWithOthers: e.target.checked})}
                        /> I want to connect with other participants
                    </label>
                </div>

                <button type="submit" className="submit-btn" disabled={formData.goal.length < 20}>
                    Save Settings
                </button>
            </form>
        </div>
    );
};

export default LearningForm;