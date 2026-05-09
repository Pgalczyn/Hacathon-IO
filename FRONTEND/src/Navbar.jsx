import React from 'react';
import './Navbar.css';

const Navbar = () => {
    return (
        <nav className="navbar">
            <ul className="nav-links">
                <li><a href="/home">Home</a></li>
                <div className="auth-buttons">
                    <li><a href="/login" className="login-btn">Login</a></li>
                    <li><a href="/register" className="register-btn">Register</a></li>
                </div>
            </ul>
        </nav>
    );
};

export default Navbar;