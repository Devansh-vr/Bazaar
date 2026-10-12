import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Converts a "7d" / "15m" style duration string into milliseconds so it
// can be used for both jwt "expiresIn" and cookie "maxAge"/expiry math.
const DURATION_UNITS = {
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
};

export const durationToMs = (duration) => {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 15 * 60 * 1000; // sensible fallback: 15 minutes
  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNITS[unit];
};

export const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );

export const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

export const getRefreshTokenExpiryDate = () =>
  new Date(Date.now() + durationToMs(REFRESH_EXPIRES_IN));

// Cookie options for the HttpOnly refresh-token cookie. `secure` is left
// off in development (no HTTPS on localhost) but should be true in any
// real deployment; NODE_ENV drives that automatically.
export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/user", // only sent to auth-related routes (refresh/logout)
  maxAge: durationToMs(REFRESH_EXPIRES_IN),
});

// Options for res.clearCookie — must match httpOnly/secure/sameSite/path
// used when the cookie was set, but omitting maxAge/expires (Express
// deprecates passing those to clearCookie).
export const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/user",
});

export const REFRESH_COOKIE_NAME = "bazaar_refresh_token";
