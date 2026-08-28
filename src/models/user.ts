import mongoose, { Schema, models, model } from "mongoose";
import type { Role } from "@/lib/constants";

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  role: Role;
  managerId?: mongoose.Types.ObjectId | null;
  teamId?: mongoose.Types.ObjectId | null;
  active: boolean;
  inviteToken?: string | null;
  inviteExpiresAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: String,
    role: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    active: { type: Boolean, default: true },
    inviteToken: { type: String, default: null },
    inviteExpiresAt: { type: Date, default: null },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

UserSchema.index({ role: 1, active: 1 });
UserSchema.index({ managerId: 1 });

export const User = models.User || model<UserDoc>("User", UserSchema);

export interface TeamDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  managerId?: mongoose.Types.ObjectId | null;
  functionalArea: string;
  memberIds: mongoose.Types.ObjectId[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<TeamDoc>(
  {
    name: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    functionalArea: { type: String, default: "" },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Team = models.Team || model<TeamDoc>("Team", TeamSchema);
