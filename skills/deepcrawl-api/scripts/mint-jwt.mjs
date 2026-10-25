// Mint an HS256 JWT for the deepcrawl worker (AUTH_MODE=jwt).
// Usage: JWT_SECRET=... node mint-jwt.mjs [sub] [ttlSeconds]
import { createHmac } from 'node:crypto';

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('Set JWT_SECRET to the worker secret.');
  process.exit(1);
}

const [sub = 'agent', ttl = '3600'] = process.argv.slice(2);
const iat = Math.floor(Date.now() / 1000);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, iat, exp: iat + Number(ttl) })}`;
const sig = createHmac('sha256', secret).update(body).digest('base64url');
console.log(`${body}.${sig}`);
