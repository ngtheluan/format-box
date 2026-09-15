"use client";

import MachuPodcast from "../machuteam/MachuPodcast";
import type { Episode } from "./types";

export default function TruyenMaBelai({ episodes, query }: { episodes: Episode[]; query?: string }) {
  return (
    <MachuPodcast
      episodes={episodes}
      query={query}
      source={{
        // Same shape as machuteam: apiPath returns { audioUrl } and the client
        // just sets it on the media element. audioUrl here is a progressive
        // mp4 (format 18) fetched straight from googlevideo — no proxying.
        apiPath: "/api/podcasts/truyenmabelai",
        artist: "Truyện Ma Bẻ Lái",
        album: "Truyện ma đêm khuya",
        storageKey: "belai-podcast",
        title: "Truyện Ma",
        titleAlt: "Bẻ Lái",
        thumbAlign: "right",
        // iOS Safari refuses YouTube's audio-only m4a in <audio>, but plays
        // combined mp4 in <video playsinline> fine.
        mediaKind: "video",
      }}
    />
  );
}
