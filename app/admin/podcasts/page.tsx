import PodcastsClient from "./PodcastsClient";
import { fetchEpisodes as fetchMachu, fetchVideos } from "./machuteam/fetchers";
import { fetchEpisodes as fetchBelai } from "./truyenmabelai/fetchers";

export const metadata = {
  title: "Podcasts — Admin",
};

export default async function AdminPodcastsPage() {
  const [machuEpisodes, videos, belaiEpisodes] = await Promise.all([
    fetchMachu(),
    fetchVideos(),
    fetchBelai(),
  ]);
  return (
    <PodcastsClient
      machuEpisodes={machuEpisodes}
      videos={videos}
      belaiEpisodes={belaiEpisodes}
    />
  );
}
