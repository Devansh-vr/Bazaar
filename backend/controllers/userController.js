import User from "../models/userModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import { validateRegisterInput, validateLoginInput } from "../utils/validators.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
  getRefreshCookieOptions,
  getClearCookieOptions,
  REFRESH_COOKIE_NAME,
} from "../utils/tokenUtils.js";

// Shapes the user object returned to the client — never includes the
// password hash or raw refresh-token data.
const toPublicUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const issueSessionAndRespond = async (res, user, statusCode) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const expiresAt = getRefreshTokenExpiryDate();

  await user.addRefreshToken(refreshToken, expiresAt);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: toPublicUser(user),
  });
};

// POST /api/v1/user/register
export const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body || {};

  const errors = validateRegisterInput({ firstName, lastName, email, password });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password, // hashed automatically by the pre-save hook
  });

  await issueSessionAndRespond(res, user, 201);
});

// POST /api/v1/user/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  const errors = validateLoginInput({ email, password });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // password has `select: false` on the schema, so it must be explicitly requested
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  // Intentionally identical error message/status for "no such user" and
  // "wrong password" so we don't leak which emails are registered.
  const invalidCredentialsResponse = () =>
    res.status(401).json({ success: false, message: "Invalid email or password" });

  if (!user) {
    return invalidCredentialsResponse();
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return invalidCredentialsResponse();
  }

  await issueSessionAndRespond(res, user, 200);
});

// POST /api/v1/user/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!rawToken) {
    return res.status(401).json({
      success: false,
      message: "No refresh token provided",
    });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(rawToken);
  } catch {
    res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
    return res.status(401).json({
      success: false,
      message: "Refresh token is invalid or expired",
    });
  }

  const user = await User.findById(decoded.id).select("+refreshTokens");
  if (!user) {
    res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
    return res.status(401).json({ success: false, message: "User no longer exists" });
  }

  const matchedSession = await user.findRefreshTokenMatch(rawToken);
  if (!matchedSession) {
    // Token was valid JWT but not a currently-active/known session
    // (already rotated, revoked, or logged out) — reject it.
    res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
    return res.status(401).json({
      success: false,
      message: "Refresh token has been revoked",
    });
  }

  // Rotate: remove the used refresh token and issue a brand new one.
  await user.removeRefreshToken(matchedSession._id);

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  const expiresAt = getRefreshTokenExpiryDate();
  await user.addRefreshToken(newRefreshToken, expiresAt);

  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

// POST /api/v1/user/logout
export const logoutUser = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (rawToken) {
    try {
      const decoded = verifyRefreshToken(rawToken);
      const user = await User.findById(decoded.id).select("+refreshTokens");
      if (user) {
        const matchedSession = await user.findRefreshTokenMatch(rawToken);
        if (matchedSession) {
          await user.removeRefreshToken(matchedSession._id);
        }
      }
    } catch {
      // Token was already invalid/expired — nothing to revoke, fall through
      // to clearing the cookie so the client is logged out regardless.
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// GET /api/v1/user/me
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.status(200).json({ success: true, user: toPublicUser(user) });
});
