"use client";

import MachuPodcast from "../machuteam/MachuPodcast";
import type { Episode } from "./types";

export default function TruyenMaBelai({ episodes, query }: { episodes: Episode[]; query?: string }) {
  return (
    <MachuPodcast
      episodes={episodes}
      query={query}
      source={{
        apiPath: "/api/podcasts/truyenmabelai",
        artist: "Truyện Ma Bẻ Lái",
        album: "Truyện ma đêm khuya",
        storageKey: "belai-podcast",
        title: "Truyện Ma",
        titleAlt: "Bẻ Lái",
        thumbAlign: "right",
        fallbackUrl: (ep) => `/api/podcasts/truyenmabelai/stream?slug=${encodeURIComponent(ep.slug)}`,
      }}
    />
  );
}
