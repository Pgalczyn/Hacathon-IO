import React from "react";
import "./index.css";
import logo from "./assets/logo.png";
import logo_head from "./assets/logo_head.png";
import logo_napis from "./assets/logo_napis.png";

import "bootstrap/dist/css/bootstrap.min.css";

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm py-2 ">
      <div className="container-fluid px-4">
        {/* Logo , nazwa*/}
        <a className="navbar-brand d-flex align-items-center gap-2" href="/">
          <img src={logo_head} height="70" className="m-0 p-0" />
          <img src={logo_napis} height="50" className="m-0 p-0" />
        </a>

        {/* for mobile -> radio button*/}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar content */}

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* <ul className="navbar-nav mx-auto gap-3">
            <li className="nav-item">
              <a href="/home" className="nav-link text-dark fw-medium">
                Home
              </a>
            </li>
          </ul> */}

          <div className="d-flex gap-2 ms-auto">
            <a href="/login" className="btn purple-btn btn-lg px-4">
              Login
            </a>
            <a href="/register" className="btn purple-btn btn-lg px-4">
              Register
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
