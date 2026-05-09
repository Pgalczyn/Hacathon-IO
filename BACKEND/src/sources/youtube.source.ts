import axios from "axios";
import type { MaterialSource, VideoResult } from "./types.js";

interface YouTubeItem {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: { high: { url: string } };
  };
}

export class YouTubeSource implements MaterialSource<string, VideoResult[]> {
  readonly name = "youtube";

  constructor(
    private readonly apiKey: string | undefined = process.env.YOUTUBE_API_KEY,
    private readonly maxResults: number = 3,
  ) {}

  async fetch(query: string): Promise<VideoResult[]> {
    if (!query || !this.apiKey) return [];
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${this.maxResults}&key=${this.apiKey}`;
      const { data } = await axios.get<{ items: YouTubeItem[] }>(url);
      return data.items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
      }));
    } catch (err) {
      console.error(`YouTube error for "${query}":`, (err as Error).message);
      return [];
    }
  }
}
