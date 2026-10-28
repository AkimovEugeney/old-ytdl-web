export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Purple Download";
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
export const YM_ID = (process.env.NEXT_PUBLIC_YM_ID ?? "").trim();
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

export type LandingPage = {
  slug: string;
  /** H1 и основа title — формулируем как реальный поисковый запрос */
  h1: string;
  title: string;
  description: string;
  keywords: string[];
  lead: string;
  sections: { h2: string; paragraphs: string[]; list?: string[] }[];
  faq: { q: string; a: string }[];
};

export const LAST_UPDATED = "17 октября 2026";
