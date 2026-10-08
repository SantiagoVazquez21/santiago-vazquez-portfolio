import { handleContactRequest } from "@/lib/contact-handler";
import { createRateLimiter } from "@/lib/rate-limit";

// Lives as long as this server instance (plan 005, section 8: best-effort).
const limiter = createRateLimiter();

export async function POST(request: Request): Promise<Response> {
  return handleContactRequest(request, {
    fetchFn: fetch,
    env: process.env,
    now: Date.now(),
    limiter,
  });
}
