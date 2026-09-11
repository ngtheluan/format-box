import { IconLayoutGrid, IconMicrophone } from "@tabler/icons-react";
import AdminBody from "../AdminBody";
import MachuPodcast from "./machuteam/MachuPodcast";
import { fetchEpisodes, fetchVideos } from "./machuteam/fetchers";

export const metadata = {
  title: "Podcasts — Admin",
};

export default async function AdminPodcastsPage() {
  const [episodes, videos] = await Promise.all([fetchEpisodes(), fetchVideos()]);

  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Podcasts", icon: <IconMicrophone size={13} stroke={1.8} />, current: true },
      ]}
    >
      <MachuPodcast episodes={episodes} videos={videos} />
    </AdminBody>
  );
}
