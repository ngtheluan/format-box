"use client";
import dynamic from "next/dynamic";

// Public, ungated read-only viewer for a shared itinerary link. The whole trip
// is carried in the URL hash, so no database lookup is needed.
const TripView = dynamic(() => import("./TripView"), { ssr: false });

export default function Page() {
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <TripView />
    </div>
  );
}
