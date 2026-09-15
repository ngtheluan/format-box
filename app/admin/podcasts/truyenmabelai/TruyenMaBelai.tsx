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
        // Use a hidden <video playsinline> because iOS Safari refuses YouTube's
        // audio-only m4a in <audio> — see MachuPodcast mediaKind comment.
        mediaKind: "video",
        directUrl: (ep) => `/api/podcasts/truyenmabelai/stream?slug=${encodeURIComponent(ep.slug)}`,
        fallbackUrl: (ep) => `/api/podcasts/truyenmabelai/stream?slug=${encodeURIComponent(ep.slug)}`,
      }}
    />
  );
}
