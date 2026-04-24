import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const CoachProfileSchema = new Schema(
  {
    specialties: { type: [String], default: [] },
    bio: { type: String, default: "" },
    certifications: { type: [String], default: [] },
    // Free tier client cap; unlimited for pro
    maxClients: { type: Number, default: 5 },
    isPro: { type: Boolean, default: false },
    proUntil: { type: Date, default: null },
  },
  { _id: false },
);

const ClientProfileSchema = new Schema(
  {
    dob: { type: Date, default: null },
    age: { type: Number, min: 0, max: 120, default: null },
    gender: {
      type: String,
      enum: ["female", "male", "undefined", null],
      default: null,
    },
    heightCm: { type: Number, min: 0, max: 300, default: null },
    weightKg: { type: Number, min: 0, max: 500, default: null },
    // "build_muscle" | "lose_fat" | "general_fitness" | "endurance" | "strength"
    goalType: { type: String, default: "general_fitness" },
    // "sedentary" | "light" | "moderate" | "active" | "very_active"
    activityLevel: { type: String, default: "moderate" },
    viewedAdvice: { type: [String], default: [] },
    relevantAdvice: { type: [String], default: [] },
    isPro: { type: Boolean, default: false },
    proUntil: { type: Date, default: null },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["coach", "client"],
      required: true,
      index: true,
    },
    name: { type: String, default: "" },
    avatar: { type: String, default: "" },
    language: { type: String, default: "en" },

    coachProfile: { type: CoachProfileSchema, default: () => ({}) },
    clientProfile: { type: ClientProfileSchema, default: () => ({}) },

    // Refresh token rotation — we store a hash so stolen DBs aren't replayable
    refreshTokenHash: { type: String, default: null },

    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Statics / methods ──────────────────────────────────────────────────────
UserSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 10);
};

UserSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Strip sensitive fields when serializing
UserSchema.methods.toPublic = function () {
  const obj = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  // Hide the opposite-role profile to keep responses clean
  if (obj.role === "coach") delete obj.clientProfile;
  if (obj.role === "client") delete obj.coachProfile;
  return obj;
};

export default mongoose.model("User", UserSchema);
