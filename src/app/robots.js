const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://major-frontend-sable.vercel.app";

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/attempt/", "/student"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
