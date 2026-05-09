import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import Login from './Login';
import Home from './Home';
import Register from './Register';
import Learning from './Learning';
import './App.css';
import {AuthProvider} from "./AuthContext.jsx";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="App">
                    <Navbar />

                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/learning" element={<Learning />} />
                    </Routes>
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
