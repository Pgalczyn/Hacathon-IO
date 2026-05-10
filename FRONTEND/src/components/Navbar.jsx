import { Link, useNavigate } from "react-router-dom";
import logo_head from "./assets/logo_head.png";
import logo_napis from "./assets/logo_napis.png";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "./AuthContext.jsx";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(user);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm py-2">
      <div className="container-fluid px-4">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <img
            src={logo_head}
            alt="Logo Head"
            height="70"
            className="m-0 p-0 d-lg-none"
          />

          <div className="d-none d-lg-flex align-items-center gap-2">
            <img
              src={logo_head}
              alt="Logo Head"
              height="70"
              className="m-0 p-0"
            />
            <img
              src={logo_napis}
              alt="Logo Napis"
              height="50"
              className="m-0 p-0"
            />
          </div>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav gap-2">
            <li className="nav-item">
              <Link to="/" className="btn navbar-btn btn-lg px-4">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/learning" className="btn navbar-btn btn-lg px-4">
                Learning
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/longplan" className="btn navbar-btn btn-lg px-4">
                Year Plan
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/weeklysummary" className="btn navbar-btn btn-lg px-4">
                Summary
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/match" className="btn navbar-btn btn-lg px-4">
                Match
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/conversation" className="btn navbar-btn btn-lg px-4">
                Tutor
              </Link>
            </li>
          </ul>

          <div className="d-flex gap-2 ms-auto align-items-center">
            {isLoggedIn ? (
              <>
                <span className="text-muted small me-2 d-none d-lg-inline">
                  Hi, {user.login}
                </span>
                <Link to="/myprofile" className="btn purple-btn btn-lg px-4">
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-secondary btn-lg px-4"
                >
                  Logout
                </button>
              </>
            ) : (
              <ul className="navbar-nav gap-2 mb-0 d-flex flex-row">
                <li className="nav-item">
                  <Link to="/login" className="btn purple-btn btn-lg px-4">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/register" className="btn purple-btn btn-lg px-4">
                    Register
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
