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
    return tasks.filter((task) => Number(task.day ?? 1) === Number(today));
  }, [data, today]);

  if (!data) {
    return (
      <div className="container py-5 text-center">
        <div
          className="card shadow-sm p-5 border-0"
          style={{ borderRadius: "16px" }}
        >
          <h3 className="fw-bold">No active plan</h3>
          <p className="text-muted">
            Start by generating your personalized learning path.
          </p>
          <Link to="/learningform" className="btn btn-primary px-4 py-2">
            Create My Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <span className="badge bg-purple px-3 py-2 mb-2">DAY {today}</span>

          <h2 className="fw-bold mb-1">Today's Focus</h2>

          <p className="text-muted mb-0">
            Stay consistent — small progress every day compounds.
          </p>
        </div>

        <Link to="/plan" className="btn purple-outline-btn rounded-pill px-4">
          View Full Plan
        </Link>
      </div>

      <div className="row g-4">
        {/* TASKS */}
        <div className="col-12 col-lg-8">
          <div
            className="card border-0 shadow-sm p-3"
            style={{ borderRadius: "20px" }}
          >
            {todaysTasks.length > 0 ? (
              todaysTasks.map((task, index) => (
                <div
                  key={index}
                  className="d-flex align-items-start gap-3 mb-3"
                >
                  <div className="pt-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      style={{
                        width: "22px",
                        height: "22px",
                        cursor: "pointer",
                        accentColor: "#9f46ed",
                      }}
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
              <div className="text-center py-5">
                <h5 className="fw-bold mb-2">
                  No tasks are planned for today...
                </h5>

                <p className="text-muted mb-0">
                  Relax, recharge, or explore something fun! Good luck!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="col-12 col-lg-4">
          <div
            className="card border-0 shadow-sm p-4"
            style={{ borderRadius: "20px" }}
          >
            <h6 className="fw-bold mb-3 purple-text">Today's Stats</h6>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted">Tasks</span>

              <span className="fw-bold fs-5 purple-text">
                {todaysTasks.length}
              </span>
            </div>

            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted">Current Day</span>

              <span className="fw-bold fs-5 purple-text">{today}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
