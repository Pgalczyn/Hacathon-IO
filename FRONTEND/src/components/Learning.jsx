import {Link} from "react-router-dom";

const Learning = () => {
    return (
        <div style={{ padding: '20px' }}>
            <div className="start-learning">
                <p> <Link to="/learningform">Set up your learning plan here</Link></p>
            </div>
        </div>

    );
};

export default Learning;