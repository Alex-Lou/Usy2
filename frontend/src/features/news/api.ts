import { apiRequest, fetchBlobUrl } from "../../lib/api/client";

export type FollowKind = "rss" | "bluesky" | "mastodon" | "reddit" | "xpost";

export interface NewsSource {
  id: string;
  label: string;
  site: string;
}

export interface Follow {
  kind: FollowKind;
  handle: string;
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
  kind: "site" | "bluesky" | "mastodon" | "reddit" | "x";
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
