import "./index.css";
import DayView from "./DayView";
import VideoView from "./PlanView";

const Home = () => {
    return (
        <div className="home-container">
            <header className="py-5 text-center bg-purple text-white">
                <p>Your plans for today</p>
            </header>
            <main>
                <DayView />
                <VideoView />
            </main>
        </div>
    );
};

export default Home;