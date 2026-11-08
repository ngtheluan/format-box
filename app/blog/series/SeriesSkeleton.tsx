import { Corners } from "@/components/BlogCard";
import { Stack } from "@/components/ui";
import "../blog.css";

export function SeriesSkeleton({
  titleWidth,
  dekWidth,
  metaWidths,
  pillWidths = [],
}: {
  titleWidth: number;
  dekWidth: number;
  metaWidths: number[];
  pillWidths?: number[];
}) {
  return (
    <div className="blog-wrap bz-skel">
      <Stack gap={28}>
        <header className="bz-hero">
          <Corners />
          <span className="bz-skel-line bz-skel-crumb" style={{ margin: "3px 0" }} />
          <span className="bz-skel-line bz-skel-eyebrow" style={{ height: 12, margin: "2px 0" }} />
          <span
            className="bz-skel-line bz-skel-title"
            style={{ width: titleWidth, maxWidth: "100%", height: 30, margin: "1px 0 8px" }}
          />
          <span
            className="bz-skel-line bz-skel-dek"
            style={{ width: dekWidth, maxWidth: "100%", margin: "3px 0" }}
          />
        </header>

        <section className="bz-sec">
          <header className="bz-sec-head">
            <span className="bz-skel-line bz-skel-sec-title" />
            {pillWidths.length > 0 && (
              <div className="bz-pills">
                {pillWidths.map((width, i) => (
                  <span key={i} className="bz-skel-pill" style={{ width, height: 36, borderRadius: 4 }} />
                ))}
              </div>
            )}
          </header>
          <div className="bz-series-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <article key={i} className="bz-tile bz-series-card">
                <span className="bz-series-card-link">
                  <span className="bz-series-cover">
                    <span className="bz-skel-media bz-skel-fill" />
                  </span>
                  <span className="bz-series-body">
                    <span className="bz-skel-line" style={{ height: 11, width: 72 }} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="bz-skel-line" style={{ height: 20 }} />
                      <span className="bz-skel-line short" style={{ height: 20 }} />
                    </span>
                    <span className="bz-series-meta">
                      {metaWidths.map((width, j) => (
                        <span key={j} className="bz-skel-line" style={{ height: 12, width }} />
                      ))}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span className="bz-skel-line" style={{ height: 13 }} />
                      <span className="bz-skel-line short" style={{ height: 13 }} />
                    </span>
                  </span>
                  <span className="bz-series-cta-slot">
                    <span className="bz-skel-pill bz-skel-series-cta" />
                  </span>
                </span>
              </article>
            ))}
          </div>
        </section>
      </Stack>
    </div>
  );
}
