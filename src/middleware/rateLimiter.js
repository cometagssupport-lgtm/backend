import rateLimit from 'express-rate-limit';

/**
 * loginLimiter — max 10 login attempts per IP per 15 minutes.
 * Prevents brute-force password attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    data: null,
  },
});

/**
 * otpLimiter — max 5 OTP requests per IP per 10 minutes.
 * Prevents OTP spam/enumeration attacks.
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many OTP requests. Please try again in 10 minutes.',
    data: null,
  },
});

/**
 * withdrawLimiter — max 5 withdrawal attempts per IP per 10 minutes.
 * Prevents rapid repeated withdrawal manipulation.
 */
export const withdrawLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many withdrawal requests. Please try again in 10 minutes.',
    data: null,
  },
});

/**
 * generalLimiter — broad API-wide rate limit.
 * Max 200 requests per IP per 15 minutes.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many requests. Please slow down.',
    data: null,
  },
});
