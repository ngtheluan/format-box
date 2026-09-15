import PodcastsClient from "./PodcastsClient";
import { fetchEpisodes, fetchVideos } from "./machuteam/fetchers";

export const metadata = {
  title: "Podcasts — Admin",
};

export default async function AdminPodcastsPage() {
  const [episodes, videos] = await Promise.all([fetchEpisodes(), fetchVideos()]);
  return <PodcastsClient episodes={episodes} videos={videos} />;
}
