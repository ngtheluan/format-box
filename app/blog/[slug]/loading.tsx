import "../blog.css";

export default function Loading() {
  return (
    <div className="bd bz-skel">
      <header className="bd-head">
        <span className="bz-skel-line bz-skel-crumb" />
        <div className="bd-chips">
          <span className="bz-skel-chip" />
          <span className="bz-skel-chip" />
          <span className="bz-skel-chip short" />
        </div>
        <span className="bz-skel-line bz-skel-bd-title" />
        <span className="bz-skel-line bz-skel-bd-title short" />
        <span className="bz-skel-line bz-skel-dek" />
        <div className="bd-byline">
          <span className="bz-skel-avatar" style={{ borderRadius: 3, width: 28, height: 28 }} />
          <span className="bz-skel-line bz-skel-byline-meta" />
        </div>
      </header>

      <div className="bd-layout">
        <div className="bd-article">
          <div
            className="bd-figure bz-skel-media"
            style={{ aspectRatio: "21 / 9", maxHeight: 320, borderRadius: 2 }}
          />
          <div className="bz-skel-body-article">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={`bz-skel-line bz-skel-para${i % 4 === 3 ? " short" : ""}`} />
            ))}
          </div>
        </div>
        <aside className="bd-aside">
          <div className="bz-skel-toc" style={{ borderRadius: 4 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="bz-skel-line bz-skel-toc-item" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
