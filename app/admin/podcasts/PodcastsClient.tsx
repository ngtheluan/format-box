"use client";

import { IconLayoutGrid, IconMicrophone } from "@tabler/icons-react";
import { useState } from "react";
import AdminBody from "../AdminBody";
import MachuPodcast from "./machuteam/MachuPodcast";
import type { Episode, Video } from "./machuteam/types";

export default function PodcastsClient({ episodes, videos }: { episodes: Episode[]; videos: Video[] }) {
  const [query, setQuery] = useState("");
  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Podcasts", icon: <IconMicrophone size={13} stroke={1.8} />, current: true },
      ]}
      search={{ value: query, onChange: setQuery, placeholder: "Tìm tập..." }}
    >
      <MachuPodcast episodes={episodes} videos={videos} query={query} />
    </AdminBody>
  );
}
