import {useState} from "react";
import {Link, useNavigate} from 'react-router-dom';
const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try{
            const response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    login: username,
                    password: password,
                }),
                credentials: "include"
            });

            const data = await response.json()

            if(response.ok){
                alert("Login successful!");
            }
            else {
                alert("Error " + response.status + ": " + data.message);
            }
        }
        catch(err){
            console.log(err);
        }

        navigate('/Home');
    };

    return (
        <div className="d-flex justify-content-center align-items-center w-100 h-100 bg-light">
            <div
                className="card shadow-sm p-4 w-100"
                style={{ maxWidth: "450px", borderRadius: "16px" }}
            >
                <h2 className="text-center mb-4 fw-bold">Log in</h2>
                <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                    <input
                        type="text"
                        value={username}
                        className="form-control"
                        placeholder="username*"
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        type="password"
                        value={password}
                        className="form-control"
                        placeholder="password*"
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit" className="btn purple-btn btn-lg px-4">
                        Submit
                    </button>
                </form>
                <div className="auth-switch text-center mt-3">
                    <span className="text-muted">Don't have an account?</span>{" "}
                    <Link to="/register" className="auth-link">
                        Register here →
                    </Link>
                </div>
            </div>
        </div>
    );
};
export default Login;
