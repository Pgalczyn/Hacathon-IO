import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import Login from './Login';
import Home from './Home';
import Register from './Register';
import Learning from './Learning';
import './App.css';

function App() {
    return (
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
    );
}

export default App;