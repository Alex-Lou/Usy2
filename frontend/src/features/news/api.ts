import { apiRequest, fetchBlobUrl } from "../../lib/api/client";

export type FollowKind = "rss" | "bluesky" | "mastodon" | "reddit" | "xpost" | "youtube";

export interface NewsSource {
  id: string;
  label: string;
  site: string;
}

export interface Follow {
  kind: FollowKind;
  handle: string;
  /** The name shown for it when the handle isn't readable (a YouTube channel id). */
  label?: string | null;
}

export interface YoutubeChannel {
  id: string;
  title: string;
  handle: string | null;
  image: string | null;
  subscribers: string | null;
}

export interface NewsPrefs {
  /** The "Actus" tab is only there when switched on (Mon profil › Pour moi). */
  enabled: boolean;
  sources: string[];
  follows: Follow[];
}

export interface NewsItem {
  source: string;
  sourceLabel: string;
  kind: "site" | "bluesky" | "mastodon" | "reddit" | "x" | "youtube";
  title: string | null;
  text: string | null;
  url: string;
  image: string | null;
  author: string | null;
  publishedAt: string | null;
}

export const getNews = () => apiRequest<NewsItem[]>("/api/news");
export const getNewsSources = () => apiRequest<NewsSource[]>("/api/news/sources");
export const getNewsPrefs = () => apiRequest<NewsPrefs>("/api/news/prefs");
export const saveNewsPrefs = (prefs: NewsPrefs) => apiRequest<NewsPrefs>("/api/news/prefs", { method: "PUT", body: prefs });
/** A picture of an item, through the server (the phone never contacts the site). */
export const getNewsImage = (url: string) => fetchBlobUrl(`/api/news/image?url=${encodeURIComponent(url)}`);
/** My Reddit home feed: only the account is ever sent back, never the private link. */
export const getRedditHome = () => apiRequest<{ user?: string }>("/api/news/reddit-home");
export const saveRedditHome = (url: string) => apiRequest<{ user: string }>("/api/news/reddit-home", { method: "PUT", body: { url } });
export const removeRedditHome = () => apiRequest<void>("/api/news/reddit-home", { method: "DELETE" });
/** YouTube channels matching a few words, found by the server. */
export const searchYoutube = (q: string) => apiRequest<YoutubeChannel[]>(`/api/news/youtube/search?q=${encodeURIComponent(q)}`);
/** My sources that answered nothing on their last try. */
export const getFailingSources = () => apiRequest<string[]>("/api/news/failing");
