import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trailing-slash redirects are decided by resolveRequest in the proxy (plan, D2).
  skipTrailingSlashRedirect: true,
  // Otherwise `next dev` writes an AGENTS.md the owner never approved (plan, D34).
  agentRules: false,
  // Next gets its own tsconfig so `npx tsc --noEmit` never reads generated files (plan, D9).
  typescript: { tsconfigPath: "tsconfig.next.json" },
};

export default nextConfig;
