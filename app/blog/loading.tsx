import { Stack } from "@/components/ui";
import "./blog.css";

export default function Loading() {
  return (
    <Stack gap={28}>
      <div className="blog-wrap bz-skel">
        <header className="bz-hero" style={{ margin: "16px 0" }}>
          <span className="bz-skel-line bz-skel-eyebrow" />
          <span className="bz-skel-line bz-skel-title" />
          <span className="bz-skel-line bz-skel-dek" />
        </header>

        <div className="bz-top" style={{ margin: "16px 0" }}>
          <article className="bz-tile bz-feat">
            <span className="bz-feat-link">
              <span className="bz-media bz-skel-media" />
              <span className="bz-feat-body">
                <span className="bz-skel-line bz-skel-chip" />
                <span className="bz-skel-line bz-skel-h2" />
                <span className="bz-skel-line bz-skel-h2 short" />
                <span className="bz-skel-line bz-skel-ex" />
                <span className="bz-skel-line bz-skel-ex short" />
              </span>
            </span>
          </article>
          <div className="bz-side">
            {Array.from({ length: 3 }).map((_, i) => (
              <article key={i} className="bz-tile bz-side-item">
                <span style={{ display: "flex", alignItems: "center", gap: 12, height: "100%" }}>
                  <span
                    className="bz-media bz-skel-media"
                    style={{ flex: "0 0 58%", alignSelf: "stretch", aspectRatio: "auto", minHeight: 100 }}
                  />
                  <span className="bz-side-text">
                    <span className="bz-skel-line bz-skel-h2" />
                    <span className="bz-skel-line bz-skel-ex short" />
                  </span>
                </span>
              </article>
            ))}
          </div>
        </div>

        <section className="bz-sec" style={{ margin: "16px 0" }}>
          <header className="bz-sec-head">
            <span className="bz-skel-line bz-skel-sec-title" />
            <div className="bz-skel-pills">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="bz-skel-pill" />
              ))}
            </div>
          </header>
          <div className="bz-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bzc">
                <span className="bzc-media bz-skel-media" />
                <span className="bzc-body">
                  <span className="bz-skel-line" style={{ height: 10, width: 60 }} />
                  <span className="bz-skel-line" style={{ height: 14 }} />
                  <span className="bz-skel-line short" style={{ height: 14 }} />
                  <span className="bzc-author" style={{ gap: 8 }}>
                    <span className="bz-skel-avatar" style={{ width: 20, height: 20, borderRadius: 2 }} />
                    <span className="bz-skel-line" style={{ height: 10, width: 80 }} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bz-sec dyk-sec" aria-hidden="true" style={{ margin: "16px 0" }}>
          <header className="bz-sec-head">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="bz-skel-line bz-skel-eyebrow" style={{ marginBottom: 0 }} />
              <span className="bz-skel-line bz-skel-sec-title" />
              <span className="bz-skel-line" style={{ height: 12, width: 260, maxWidth: "100%" }} />
            </div>
          </header>
          <div className="dyk-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ui-btn dyk-card" style={{ cursor: "default", pointerEvents: "none" }}>
                <span className="ui-btn-label">
                  <span className="dyk-frame">
                    <span className="dyk-mat">
                      <span className="bz-skel-media bz-skel-fill" />
                    </span>
                  </span>
                  <span className="dyk-plaque">
                    <span className="bz-skel-line" style={{ height: 10, width: "70%", margin: "2px 0" }} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span className="bz-skel-line" style={{ height: 14 }} />
                      <span className="bz-skel-line short" style={{ height: 14 }} />
                    </span>
                    <span className="dyk-cta">
                      <span className="bz-skel-line" style={{ height: 11, width: 80 }} />
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Stack>
  );
}
