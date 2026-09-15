"use client";

import { IconGhost, IconLayoutGrid, IconMicrophone, IconSkull } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import AdminBody from "../AdminBody";
import MachuPodcast from "./machuteam/MachuPodcast";
import type { Episode as MachuEpisode, Video } from "./machuteam/types";
import TruyenMaBelai from "./truyenmabelai/TruyenMaBelai";
import type { Episode as BelaiEpisode } from "./truyenmabelai/types";

type Tab = "machuteam" | "truyenmabelai";

function countMatches(list: { title: string }[], q: string): number {
  const lq = q.toLowerCase().trim();
  if (!lq) return list.length;
  return list.reduce((n, ep) => n + (ep.title.toLowerCase().includes(lq) ? 1 : 0), 0);
}

export default function PodcastsClient({
  machuEpisodes,
  videos,
  belaiEpisodes,
}: {
  machuEpisodes: MachuEpisode[];
  videos: Video[];
  belaiEpisodes: BelaiEpisode[];
}) {
  const [tab, setTab] = useState<Tab>("machuteam");
  const [query, setQuery] = useState("");

  const machuCount = useMemo(() => countMatches(machuEpisodes, query), [machuEpisodes, query]);
  const belaiCount = useMemo(() => countMatches(belaiEpisodes, query), [belaiEpisodes, query]);

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "machuteam", label: "MachuTeam", icon: <IconSkull size={14} stroke={1.9} />, count: machuCount },
    { id: "truyenmabelai", label: "Truyện Ma Bẻ Lái", icon: <IconGhost size={14} stroke={1.9} />, count: belaiCount },
  ];

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Podcasts", icon: <IconMicrophone size={13} stroke={1.8} />, current: true },
      ]}
      search={{ value: query, onChange: setQuery, placeholder: "Tìm tập..." }}
      tabs={
        <>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`fx-tab${tab === t.id ? " on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
              <span className="mp-header-badge">{t.count}</span>
            </button>
          ))}
        </>
      }
    >
      <div hidden={tab !== "machuteam"}>
        <MachuPodcast episodes={machuEpisodes} videos={videos} query={query} />
      </div>
      <div hidden={tab !== "truyenmabelai"}>
        <TruyenMaBelai episodes={belaiEpisodes} query={query} />
      </div>
    </AdminBody>
  );
}
