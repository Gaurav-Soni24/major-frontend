import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optional: lets several local dev servers share this folder (NEXT_DIST_DIR=.next-b1 next dev -p 3011).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactCompiler: true,
  // This app lives inside a folder tree with other lockfiles; pin the workspace root.
  turbopack: { root: here },
};

export default nextConfig;
