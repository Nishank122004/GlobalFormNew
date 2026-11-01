import { afterEach, describe, expect, it, vi } from 'vitest';
import { csvLookupRateLimit } from '../src/middleware/csvLookupRateLimit.js';

let ipSequence = 0;

function invoke(ip, remoteAddress = '127.0.0.1') {
  const req = { ip, socket: { remoteAddress } };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  const next = vi.fn();
  csvLookupRateLimit(req, res, next);
  return { res, next };
}

function uniqueIp() { ipSequence += 1; return `198.51.100.${ipSequence}`; }

afterEach(() => vi.useRealTimers());

describe('csvLookupRateLimit', () => {
  it('allows requests below the configured limit', () => {
    const { res, next } = invoke(uniqueIp());
    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows the first 30 requests and rejects the 31st from one IP', () => {
    const ip = uniqueIp();
    for (let i = 0; i < 30; i += 1) {
      const result = invoke(ip);
      expect(result.next).toHaveBeenCalledOnce();
      expect(result.res.statusCode).toBe(200);
    }
    const limited = invoke(ip);
    expect(limited.next).not.toHaveBeenCalled();
    expect(limited.res.statusCode).toBe(429);
    expect(limited.res.body).toEqual({ success: false, message: 'Too many lookup requests. Try again shortly.' });
    expect(JSON.stringify(limited.res.body)).not.toMatch(/stack|sql|database|password|internal/i);
  });

  it('maintains independent limits for different IPs and shared counters for the same IP', () => {
    const ipA = uniqueIp();
    const ipB = uniqueIp();
    for (let i = 0; i < 30; i += 1) invoke(ipA);
    expect(invoke(ipA).res.statusCode).toBe(429);
    expect(invoke(ipB).next).toHaveBeenCalledOnce();
  });

  it('resets the counter after the 60-second window', () => {
    vi.useFakeTimers();
    const ip = uniqueIp();
    for (let i = 0; i < 30; i += 1) invoke(ip);
    expect(invoke(ip).res.statusCode).toBe(429);
    vi.advanceTimersByTime(60_000);
    const afterWindow = invoke(ip);
    expect(afterWindow.res.statusCode).toBe(200);
    expect(afterWindow.next).toHaveBeenCalledOnce();
  });

  it('falls back to socket address or a shared unknown key when req.ip is unavailable', () => {
    const remote = uniqueIp();
    for (let i = 0; i < 30; i += 1) invoke(undefined, remote);
    expect(invoke(undefined, remote).res.statusCode).toBe(429);
    // Missing both address sources is handled without throwing.
    const result = invoke(undefined, undefined);
    expect([200, 429]).toContain(result.res.statusCode);
  });

  it('handles malformed req.ip values without throwing', () => {
    const result = invoke('not-an-ip');
    expect(result.res.statusCode).toBe(200);
    expect(result.next).toHaveBeenCalledOnce();
  });
});
