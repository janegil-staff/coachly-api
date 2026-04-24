import CoachingRelationship from "../models/CoachingRelationship.js";
import {
  generateUniqueInviteCode,
  defaultInviteExpiry,
} from "../services/inviteCode.js";
import { config } from "../config/env.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";

export async function createInvite(req, res) {
  const { inviteMessage } = req.body || {};

  // Enforce free-tier client cap
  const activeCount = await CoachingRelationship.countDocuments({
    coachId: req.user._id,
    status: "active",
  });
  const maxClients = req.user.coachProfile?.maxClients ?? 5;
  const isPro = req.user.coachProfile?.isPro ?? false;

  if (!isPro && activeCount >= maxClients) {
    throw new ForbiddenError(
      `Free plan limit reached (${maxClients} active clients). Upgrade to Pro for unlimited clients.`,
    );
  }

  const inviteCode = await generateUniqueInviteCode();

  const rel = await CoachingRelationship.create({
    coachId: req.user._id,
    inviteCode,
    inviteCodeExpiresAt: defaultInviteExpiry(),
    inviteMessage: inviteMessage || "",
    status: "pending",
  });

  res.status(201).json({
    relationship: rel,
    inviteCode: rel.inviteCode,
    inviteUrl: `${config.inviteBaseUrl}/${rel.inviteCode}`,
    expiresAt: rel.inviteCodeExpiresAt,
  });
}

export async function redeemInvite(req, res) {
  const code = String(req.body?.code || "").trim().toUpperCase();
  if (!code) throw new BadRequestError("code is required");

  const rel = await CoachingRelationship.findOne({ inviteCode: code });
  if (!rel) throw new NotFoundError("Invite code not found");

  if (rel.status !== "pending") {
    throw new ConflictError("This invite has already been used");
  }
  if (rel.inviteCodeExpiresAt && rel.inviteCodeExpiresAt < new Date()) {
    throw new ConflictError("This invite has expired");
  }

  // Check if client is already linked to a coach via an active relationship
  const existing = await CoachingRelationship.findOne({
    clientId: req.user._id,
    status: { $in: ["active", "paused"] },
  });
  if (existing) {
    throw new ConflictError(
      "You are already connected to a coach. End that relationship first.",
    );
  }

  rel.clientId = req.user._id;
  rel.status = "active";
  rel.startedAt = new Date();
  await rel.save();

  req.user.clientProfile.coachId = rel.coachId;
  await req.user.save();

  const populated = await rel.populate([
    { path: "coachId", select: "name email avatar coachProfile" },
  ]);

  res.json({ relationship: populated });
}

export async function previewInvite(req, res) {
  const code = String(req.params.code || "").trim().toUpperCase();
  const rel = await CoachingRelationship.findOne({ inviteCode: code })
    .populate("coachId", "name avatar coachProfile.bio coachProfile.specialties");

  if (!rel) throw new NotFoundError("Invite not found");

  const expired =
    rel.inviteCodeExpiresAt && rel.inviteCodeExpiresAt < new Date();

  res.json({
    valid: rel.status === "pending" && !expired,
    status: rel.status,
    expired,
    coach: rel.coachId
      ? {
          name: rel.coachId.name,
          avatar: rel.coachId.avatar,
          bio: rel.coachId.coachProfile?.bio,
          specialties: rel.coachId.coachProfile?.specialties,
        }
      : null,
    inviteMessage: rel.inviteMessage,
  });
}
