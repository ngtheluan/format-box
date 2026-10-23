import "./blog.css";

export default function Loading() {
  return (
    <div className="blog-wrap bz-skel">
      <header className="bz-hero">
        <span className="bz-skel-line bz-skel-eyebrow" />
        <span className="bz-skel-line bz-skel-title" />
        <span className="bz-skel-line bz-skel-dek" />
      </header>

      <div className="bz-top">
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
          {Array.from({ length: 4 }).map((_, i) => (
            <article key={i} className="bz-tile bz-side-item">
              <span style={{ display: "flex", alignItems: "center", gap: 12, height: "100%" }}>
                <span className="bz-media bz-skel-media" style={{ flex: "0 0 58%", alignSelf: "stretch", aspectRatio: "auto", minHeight: 100 }} />
                <span className="bz-side-text">
                  <span className="bz-skel-line bz-skel-h2" />
                  <span className="bz-skel-line bz-skel-ex short" />
                </span>
              </span>
            </article>
          ))}
        </div>
      </div>

      <section className="bz-sec">
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
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
