export interface Episode {
  title: string;
  img: string;
  slug: string;
  ts: string;
  listens: number;
  date: string;
}

export interface Video {
  videoId: string;
  title: string;
  published: string;
  thumbnail: string;
  views: number;
  description: string;
}
