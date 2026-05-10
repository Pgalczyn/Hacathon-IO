import { useState } from "react";
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [password, setPassword] = useState('');

    const navigate = useNavigate();

    const  handleSubmit = async (e) => {
        e.preventDefault();

        const userData = {
            login: username,
            password: password,
            email: email,
            dateOfBirth: birthdate,
            name: name,
            surname: surname
        }
        try {
            const response = await fetch('http://localhost:3000/addUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Zarejestrowano!', data);
                alert("Konto stworzone pomyślnie! Zaloguj się.");
                navigate('/login');
            } else {
                alert(`Błąd: ${data.message}`);
            }
        } catch (error) {
            console.error('Błąd połączenia z serwerem:', error);
            alert("Nie udało się połączyć z serwerem.");
        }
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
                    <div className="ps-1" style={{ minHeight: "20px" }}>
                        {password.length > 0 && password.length < 8 ? (
                            <small className="text-danger fw-bold">
                                {8 - password.length} more {8 - password.length === 1 ? 'character' : 'characters'} needed
                            </small>
                        ) : password.length >= 8 ? (
                            <small className="text-success fw-bold">
                                Password is long enough ✓
                            </small>
                        ) : (
                            <small className="text-muted">Minimum 8 characters</small>
                        )}
                    </div>
                    <button type="submit" className="btn purple-btn btn-lg px-4">
                        Submit
                    </button>
                </form>
            </div>

        </div>
    );
};

export default Register;
