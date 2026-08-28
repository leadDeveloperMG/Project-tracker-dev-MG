import mongoose, { Schema, models, model } from "mongoose";
import type { HealthDimension, ProjectStatus, Rag } from "@/lib/constants";

const HealthCellSchema = new Schema(
  {
    rag: { type: String, enum: ["green", "amber", "red"], default: "amber" },
    source: { type: String, enum: ["calculated", "override"], default: "calculated" },
    rationale: String,
    score: { type: Number, default: 0 },
  },
  { _id: false },
);

export interface ProjectTemplateDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  projectType: string;
  reportingFrequency: string;
  defaultMilestones: { name: string; offsetDays: number }[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectTemplateSchema = new Schema<ProjectTemplateDoc>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    projectType: { type: String, default: "Delivery" },
    reportingFrequency: { type: String, default: "Weekly" },
    defaultMilestones: [{ name: String, offsetDays: Number }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ProjectTemplate =
  models.ProjectTemplate || model<ProjectTemplateDoc>("ProjectTemplate", ProjectTemplateSchema);

export interface ProjectDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  templateId?: mongoose.Types.ObjectId | null;
  sponsorId?: mongoose.Types.ObjectId | null;
  managerId?: mongoose.Types.ObjectId | null;
  teamLeadId?: mongoose.Types.ObjectId | null;
  businessUnit: string;
  strategicObjective: string;
  startDate?: Date | null;
  targetEndDate?: Date | null;
  actualEndDate?: Date | null;
  projectType: string;
  reportingFrequency: string;
  status: ProjectStatus;
  charter: string;
  scopeBaseline: string;
  periodGoals: string;
  goalsConfirmedAt?: Date | null;
  teamMemberIds: mongoose.Types.ObjectId[];
  stakeholderIds: mongoose.Types.ObjectId[];
  reviewerIds: mongoose.Types.ObjectId[];
  approverIds: mongoose.Types.ObjectId[];
  health: Record<HealthDimension, { rag: Rag; source: string; rationale?: string; score: number }>;
  overallRag: Rag;
  counter: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<ProjectDoc>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    templateId: { type: Schema.Types.ObjectId, ref: "ProjectTemplate" },
    sponsorId: { type: Schema.Types.ObjectId, ref: "User" },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    teamLeadId: { type: Schema.Types.ObjectId, ref: "User" },
    businessUnit: { type: String, default: "" },
    strategicObjective: { type: String, default: "" },
    startDate: Date,
    targetEndDate: Date,
    actualEndDate: Date,
    projectType: { type: String, default: "Delivery" },
    reportingFrequency: { type: String, default: "Weekly" },
    status: { type: String, default: "Proposed" },
    charter: { type: String, default: "" },
    scopeBaseline: { type: String, default: "" },
    periodGoals: { type: String, default: "" },
    goalsConfirmedAt: Date,
    teamMemberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    stakeholderIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reviewerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    approverIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    health: {
      scope: { type: HealthCellSchema, default: () => ({}) },
      schedule: { type: HealthCellSchema, default: () => ({}) },
      delivery: { type: HealthCellSchema, default: () => ({}) },
      quality: { type: HealthCellSchema, default: () => ({}) },
      risks: { type: HealthCellSchema, default: () => ({}) },
      resources: { type: HealthCellSchema, default: () => ({}) },
      stakeholders: { type: HealthCellSchema, default: () => ({}) },
    },
    overallRag: { type: String, default: "amber" },
    counter: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ProjectSchema.index({ status: 1, overallRag: 1 });
ProjectSchema.index({ managerId: 1 });
ProjectSchema.index({ businessUnit: 1 });
ProjectSchema.index({ deletedAt: 1 });

export const Project = models.Project || model<ProjectDoc>("Project", ProjectSchema);
