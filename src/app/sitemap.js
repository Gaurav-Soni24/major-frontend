const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://major-frontend-sable.vercel.app";

export default function sitemap() {
  return ["", "/login", "/register"].map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.5 }));
}
