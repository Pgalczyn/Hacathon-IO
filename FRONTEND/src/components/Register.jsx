import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";

const Register = () => {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div className="d-flex justify-content-center align-items-center w-100 h-100 bg-light">
      <div
        className="card shadow-sm p-4 w-100"
        style={{ maxWidth: "450px", borderRadius: "16px" }}
      >
        <h2 className="text-center mb-4 fw-bold">Register</h2>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-control"
            placeholder="Name*"
          />

          <input
            className="form-control"
            placeholder="Surname*"
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
          />

          <input
            className="form-control"
            placeholder="Username*"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="form-control"
            placeholder="Email*"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="form-control"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
          />

          <input
            className="form-control"
            placeholder="Password*"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn purple-btn btn-lg px-4">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
