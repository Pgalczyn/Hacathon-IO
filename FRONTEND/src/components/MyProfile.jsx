import { useState } from "react";
import {Link, useNavigate} from 'react-router-dom';

const MyProfile = () => {
    const savedUser = {
        name: "John",
        surname: "Doe",
        username: "johndoe123",
        email: "john.doe@example.com",
        birthdate: new Date('2000-02-02'),
        password: "••••••••"
    };

    if (!savedUser) return(
    <div className="auth-switch">
        <p>Don't have an account? <Link to="/register">Register here</Link></p>
    </div>
    );
    else return(
        <div className="auth-switch">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {savedUser.name[0]}{savedUser.surname[0]}
                    </div>
                    <h2>{savedUser.username}</h2>
                    <span className="profile-status">Verified Member</span>
                </div>

                <div className="profile-details">
                    <div className="detail-item">
                        <label>Full Name</label>
                        <p>{savedUser.name} {savedUser.surname}</p>
                    </div>
                    <div className="detail-item">
                        <label>Email</label>
                        <p>{savedUser.email} {savedUser.surname}</p>
                    </div>
                    <div className="detail-item">
                        <label>Password</label>
                        <p>{savedUser.password} {savedUser.surname}</p>
                    </div>


                </div></div>
        </div>
    );
};

export default MyProfile;