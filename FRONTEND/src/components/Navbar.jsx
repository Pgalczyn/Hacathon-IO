import React from 'react';
import { Link } from 'react-router-dom';
import logo_head from "./assets/logo_head.png";
import logo_napis from "./assets/logo_napis.png";
import "bootstrap/dist/css/bootstrap.min.css";
// import './Navbar.css';

const Navbar = () => {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);

    return (
        <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm py-2">
            <div className="container-fluid px-4">
                <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
                    <img src={logo_head} alt="Logo Head" height="70" className="m-0 p-0" />
                    <img src={logo_napis} alt="Logo Napis" height="50" className="m-0 p-0" />
                </Link>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Navbar */}
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav mx-auto gap-3">
                        <li className="nav-item">
                            <Link to="/" className="nav-link text-dark fw-medium">Home</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/learning" className="nav-link text-dark fw-medium">Learning</Link>
                        </li>
                    </ul>

                    {/* Przyciski po prawej */}
                    <div className="d-flex gap-2 ms-auto">
                        {isLoggedIn ? (
                            <Link to="/myprofile" className="btn purple-btn btn-lg px-4">
                                My Profile
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="btn purple-btn btn-lg px-4">
                                    Login
                                </Link>
                                <Link to="/register" className="btn purple-btn btn-lg px-4">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;