import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { TaskCard, loadCachedPlan } from "./PlanView";

const DayView = ({ dayOverride }) => {
    const location = useLocation();

    const data = useMemo(() => {
        const cached = loadCachedPlan();
        return location.state?.plan ?? cached;
    }, [location.state]);
    const today = useMemo(() => {
        if (dayOverride) return dayOverride;
        if (!data?.createdAt) return 1;

        const start = new Date(data.createdAt).getTime();
        const now = new Date().getTime();
        const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays + 1);
    }, [data, dayOverride]);

    const todaysTasks = useMemo(() => {
        const tasks = data?.plan?.tasks || data?.tasks || [];
        return tasks.filter(task => Number(task.day ?? 1) === Number(today));
    }, [data, today]);

    if (!data) {
        return (
            <div className="container py-5 text-center">
                <div className="card shadow-sm p-5 border-0" style={{ borderRadius: "16px" }}>
                    <h3 className="fw-bold">No active plan</h3>
                    <p className="text-muted">Start by generating your personalized learning path.</p>
                    <Link to="/learningform" className="btn btn-primary px-4 py-2">
                        Create My Plan
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <span className="badge bg-primary mb-2">PROGRESS</span>
                    <h2 className="fw-bold mb-0">Today's Focus</h2>
                </div>
                <Link to="/plan" className="btn btn-outline-dark btn-sm rounded-pill px-3">
                    View Full Plan ↗
                </Link>
            </div>

            <div className="row">
                <div className="col-12 col-lg-8">
                    {todaysTasks.length > 0 ? (
                        todaysTasks.map((task, index) => (
                            <div key={index} className="d-flex align-items-start gap-3 mb-3">
                                <div className="mt-2">
                                    <input
                                        type="checkbox"
                                        className="form-check-input border-secondary"
                                        style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                    />
                                </div>
                                <div className="flex-grow-1">
                                    <TaskCard
                                        task={task}
                                        planId={data.planId}
                                        taskIndex={index}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-5 bg-white shadow-sm rounded-4 border">
                            <p className="text-muted mb-0">Relax! No tasks scheduled for Day {today}.</p>
                        </div>
                    )}
                </div>
                <div className="col-12 col-lg-4">
                    <div className="card border-0 bg-light p-3 mb-3" style={{ borderRadius: "12px" }}>
                        <h6 className="fw-bold small text-uppercase">Stats</h6>
                        <div className="d-flex justify-content-between">
                            <span className="small">Tasks:</span>
                            <span className="small fw-bold">{todaysTasks.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayView;