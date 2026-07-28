import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthPayload } from '../auth';

// Mock env module to avoid dotenv/Prisma issues
vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-for-testing-12345',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    PORT: 3001,
    SCALE_PORT: 'COM3',
    SCALE_BAUD_RATE: 9600,
    BUSINESS_NAME: 'Test',
    BUSINESS_ADDRESS: '',
    BUSINESS_PHONE: '',
    JWT_EXPIRES_IN: '8h',
  },
}));

function mockReq(authHeader?: string, queryToken?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    query: queryToken ? { token: queryToken } : {},
    user: undefined,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const next: NextFunction = vi.fn();

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() with valid Bearer token', () => {
    const payload: AuthPayload = { userId: 1, role: 'ADMIN' };
    const token = jwt.sign(payload, 'test-secret-for-testing-12345');

    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe(1);
    expect(req.user?.role).toBe('ADMIN');
  });

  it('calls next() with valid query token', () => {
    const payload: AuthPayload = { userId: 2, role: 'VENDEDOR' };
    const token = jwt.sign(payload, 'test-secret-for-testing-12345');

    const req = mockReq(undefined, token);
    const res = mockRes();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.userId).toBe(2);
  });

  it('returns 401 when no token provided', () => {
    const req = mockReq();
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token is invalid', () => {
    const req = mockReq('Bearer invalid-token-here');
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
  });

  it('returns 401 when token is expired', () => {
    const payload: AuthPayload = { userId: 1, role: 'ADMIN' };
    const token = jwt.sign(payload, 'test-secret-for-testing-12345', { expiresIn: '-1s' });

    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const req = mockReq('Basic abc123');
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authorize middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() when user has required role', () => {
    const req = mockReq();
    (req as any).user = { userId: 1, role: 'ADMIN' };
    const res = mockRes();

    authorize('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('calls next() when no specific roles required', () => {
    const req = mockReq();
    (req as any).user = { userId: 1, role: 'VENDEDOR' };
    const res = mockRes();

    authorize()(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user role not in allowed roles', () => {
    const req = mockReq();
    (req as any).user = { userId: 1, role: 'VENDEDOR' };
    const res = mockRes();

    authorize('ADMIN', 'SUPERVISOR')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sin permisos' });
  });

  it('returns 401 when user is not authenticated', () => {
    const req = mockReq();
    const res = mockRes();

    authorize('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' });
  });
});
