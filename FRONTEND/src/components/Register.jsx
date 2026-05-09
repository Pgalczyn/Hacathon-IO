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
                // 3. JEŚLI BACKEND ODPOWIEDZIAŁ SUKCESEM:
                console.log('Zarejestrowano!', data);
                alert("Konto stworzone pomyślnie!");
                navigate('/'); // Teraz navigate ma sens - wracamy na stronę główną
            } else {
                // 4. JEŚLI BACKEND ZWRÓCIŁ BŁĄD (np. email już istnieje):
                alert(`Błąd: ${data.message}`);
            }
        } catch (error) {
            console.error('Błąd połączenia z serwerem:', error);
            alert("Nie udało się połączyć z serwerem.");
        }

        navigate('/');
    };

    return (
        <div className="register-container">
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Surname</label>
                    <input
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Birthdate</label>
                    <input
                        type="date"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.target.value)}
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
        </div>
    );
};

export default Register;
