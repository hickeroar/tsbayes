import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

/** Probe routes intentionally bypass auth checks. */
export function isProbePath(url: string): boolean {
  const path = (url ?? "").split("?")[0] ?? "/";
  return path === "/healthz" || path === "/readyz";
}

/** Validates bearer auth for protected routes and writes 401 responses when needed. */
export function checkAuthorization(
  token: string | null,
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  if (!token || isProbePath(request.url)) {
    return true;
  }

  const header = request.headers.authorization;
  if (!header) {
    reply.header("WWW-Authenticate", "Bearer");
    reply.code(401).send({ error: "unauthorized" });
    return false;
  }

  const match = /^Bearer ([^\s]+)$/i.exec(header.trim());
  if (!match) {
    reply.header("WWW-Authenticate", "Bearer");
    reply.code(401).send({ error: "unauthorized" });
    return false;
  }
  const value = match[1]!;

  if (!safeEqual(value, token)) {
    reply.header("WWW-Authenticate", "Bearer");
    reply.code(401).send({ error: "unauthorized" });
    return false;
  }

  return true;
}

/**
 * Constant-time comparison for token equality.
 * For mismatched lengths we still run timingSafeEqual on padded buffers.
 */
function safeEqual(left: string, right: string): boolean {
  const l = Buffer.from(left, "utf8");
  const r = Buffer.from(right, "utf8");
  if (l.length !== r.length) {
    const max = Math.max(l.length, r.length);
    const lp = Buffer.alloc(max);
    const rp = Buffer.alloc(max);
    l.copy(lp);
    r.copy(rp);
    timingSafeEqual(lp, rp);
    return false;
  }

  return timingSafeEqual(l, r);
}
