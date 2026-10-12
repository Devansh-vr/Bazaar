import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;

// Refresh tokens are long, high-entropy JWTs (not user-chosen secrets),
// so they're hashed with SHA-256 rather than bcrypt for comparison.
// This also sidesteps bcrypt's 72-byte input truncation, which would
// otherwise cause two different tokens sharing a long common prefix
// (e.g. same header + same embedded user id) to hash identically.
const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(rawToken).digest("hex");

// A refresh token is stored hashed (never in plain text) alongside an
// expiry so individual sessions/devices can be validated and revoked
// independently (e.g. logging out of one device doesn't affect others).
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never return password by default
      // NOTE: hashing with bcrypt will be wired up (pre-save hook +
      // comparePassword method) when authentication is implemented.
    },
    role: {
      type: String,
      enum: ["Customer", "Admin"],
      default: "Customer",
    },
    // Active refresh-token sessions for this user. Supports multiple
    // devices and per-session revocation (logout removes just one entry).
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

// Note: no separate userSchema.index({ email: 1 }) call here — the
// `unique: true` on the field above already creates that index.

// Hash the password with bcrypt (10 salt rounds) whenever it is set
// or changed. Never store or transmit plain-text passwords.
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

// Compares a plain-text candidate password against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Stores a new refresh-token session (hashed) for this user.
userSchema.methods.addRefreshToken = async function addRefreshToken(
  rawToken,
  expiresAt
) {
  const tokenHash = hashToken(rawToken);
  this.refreshTokens.push({ tokenHash, expiresAt });
  // Cap stored sessions to avoid unbounded growth from repeated logins.
  const MAX_SESSIONS = 5;
  if (this.refreshTokens.length > MAX_SESSIONS) {
    this.refreshTokens = this.refreshTokens.slice(-MAX_SESSIONS);
  }
  await this.save();
};

// Finds the stored session matching a raw refresh token, if any
// (and not expired). Returns the subdocument or null.
userSchema.methods.findRefreshTokenMatch = async function findRefreshTokenMatch(
  rawToken
) {
  const now = new Date();
  const incomingHash = hashToken(rawToken);
  for (const entry of this.refreshTokens) {
    if (entry.expiresAt < now) continue;
    if (entry.tokenHash === incomingHash) return entry;
  }
  return null;
};

// Removes a specific stored refresh-token session (used on logout /
// token rotation) by its subdocument id.
userSchema.methods.removeRefreshToken = async function removeRefreshToken(
  entryId
) {
  this.refreshTokens = this.refreshTokens.filter(
    (entry) => String(entry._id) !== String(entryId)
  );
  await this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
