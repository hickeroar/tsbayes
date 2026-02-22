import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

export function isProbePath(path: string): boolean {
  return path === "/healthz" || path === "/readyz";
}

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
