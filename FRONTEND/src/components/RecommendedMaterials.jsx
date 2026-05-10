import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  VideoCard,
  SimpleListItem,
  loadCachedPlan,
  reviewRouteFor,
} from "./PlanView";

const RecommendedMaterials = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const data = useMemo(() => {
    return location.state?.plan ?? loadCachedPlan();
  }, [location.state]);

  const materials = data?.materials;
  const planId = data?.planId ?? null;

  const goReview = (route, material) =>
    navigate(route, {
      state: {
        material: {
          ...material,
          planId,
        },
      },
    });

  if (!materials) {
    return (
      <div className="container py-4">
        <div
          className="card border-0 shadow-sm text-center p-5"
          style={{
            borderRadius: "24px",
            background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
          }}
        >
          <h4 className="fw-bold mb-2">No materials yet</h4>

          <p className="text-muted mb-0">
            Generate your learning plan to unlock personalized recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div
        className="card border-0 shadow-sm p-4 p-lg-5"
        style={{
          borderRadius: "28px",
          background: "linear-gradient(135deg, #ffffff 0%, #faf7ff 100%)",
        }}
      >
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <span
              className="badge mb-2 px-3 py-2"
              style={{
                backgroundColor: "#f1e4ff",
                color: "#7b2cbf",
                fontWeight: 600,
              }}
            >
              MATERIALS
            </span>

            <h2 className="fw-bold mb-1">Recommended For You</h2>

            <p className="text-muted mb-0">
              Curated resources matching your learning journey.
            </p>
          </div>
        </div>

        {/* VIDEOS */}
        {materials.videos?.length > 0 && (
          <div className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0">Videos</h5>

              <span className="small text-muted">
                {materials.videos.length} resources
              </span>
            </div>

            <div className="row g-4">
              {materials.videos.map((v, i) => (
                <div key={v.videoId ?? i} className="col-12 col-md-6 col-xl-4">
                  <VideoCard
                    v={v}
                    onReview={() =>
                      goReview(reviewRouteFor("video"), {
                        key: `video-${i}`,
                        title: v.title,
                        type: "video",
                        url: v.embedUrl ?? null,
                        source: "YouTube",
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOOKS */}
        {materials.books?.length > 0 && (
          <div className="mb-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0">Books</h5>

              <span className="small text-muted">
                {materials.books.length} resources
              </span>
            </div>

            <div className="d-flex flex-column gap-3">
              {materials.books.map((b, i) => (
                <SimpleListItem
                  key={`${b.title}-${i}`}
                  title={b.title}
                  subtitle={b.author}
                  href={b.readUrl}
                  onReview={() =>
                    goReview(reviewRouteFor("book"), {
                      key: `book-${i}`,
                      title: b.title,
                      type: "book",
                      url: b.readUrl ?? null,
                      source: b.author ?? "Project Gutenberg",
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* PAPERS */}
        {materials.academic_papers?.length > 0 && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="fw-bold mb-0">Academic Papers</h5>

              <span className="small text-muted">
                {materials.academic_papers.length} resources
              </span>
            </div>

            <div className="d-flex flex-column gap-3">
              {materials.academic_papers.map((p, i) => (
                <SimpleListItem
                  key={`${p.title}-${i}`}
                  title={p.title}
                  subtitle={`${p.author}${p.year ? ` · ${p.year}` : ""}`}
                  href={p.pdfUrl}
                  onReview={() =>
                    goReview(reviewRouteFor("article"), {
                      key: `paper-${i}`,
                      title: p.title,
                      type: "article",
                      url: p.pdfUrl ?? null,
                      source: `${p.author}${p.year ? ` · ${p.year}` : ""}`,
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedMaterials;
