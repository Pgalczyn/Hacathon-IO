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
        <div className="login-container">
            <h2>Log in</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button type="submit">Submit</button>
            </form>
            <div className="auth-switch">
                <p>Don't have an account? <Link to="/register">Register here</Link></p>
            </div>
        </div>


    );
};

export default Login;
