import mongoose, { Schema, models, model } from "mongoose";
import type { KpiDirection } from "@/lib/constants";

export interface KraCatalogDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  applicableRole: string;
  weight: number;
  ownerRole: string;
  period: string;
  approvalStatus: "draft" | "approved" | "retired";
  createdAt: Date;
  updatedAt: Date;
}

const KraCatalogSchema = new Schema<KraCatalogDoc>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    applicableRole: { type: String, required: true },
    weight: { type: Number, required: true },
    ownerRole: { type: String, default: "pmo_admin" },
    period: { type: String, default: "quarterly" },
    approvalStatus: { type: String, default: "approved" },
  },
  { timestamps: true },
);

export const KraCatalog = models.KraCatalog || model<KraCatalogDoc>("KraCatalog", KraCatalogSchema);

export interface KpiCatalogDoc {
  _id: mongoose.Types.ObjectId;
  key: string;
  name: string;
  description: string;
  kraId: mongoose.Types.ObjectId;
  ownerType: "project" | "team" | "member";
  formula: string;
  target: number;
  thresholdBands: { green: number; amber: number };
  weight: number;
  measurementPeriod: string;
  dataSource: "calculated" | "manual";
  direction: KpiDirection;
  approvalStatus: "draft" | "approved" | "retired";
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  minSampleSize: number;
  qualityGuardrail?: { metric: string; min?: number; max?: number };
  createdAt: Date;
  updatedAt: Date;
}

const KpiCatalogSchema = new Schema<KpiCatalogDoc>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    kraId: { type: Schema.Types.ObjectId, ref: "KraCatalog", required: true },
    ownerType: { type: String, default: "member" },
    formula: { type: String, default: "" },
    target: { type: Number, required: true },
    thresholdBands: {
      green: Number,
      amber: Number,
    },
    weight: { type: Number, required: true },
    measurementPeriod: { type: String, default: "quarterly" },
    dataSource: { type: String, default: "calculated" },
    direction: { type: String, default: "higher-is-better" },
    approvalStatus: { type: String, default: "approved" },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: Date,
    minSampleSize: { type: Number, default: 3 },
    qualityGuardrail: { metric: String, min: Number, max: Number },
  },
  { timestamps: true },
);

KpiCatalogSchema.index({ key: 1, kraId: 1 });

export const KpiCatalog = models.KpiCatalog || model<KpiCatalogDoc>("KpiCatalog", KpiCatalogSchema);

export interface ScorecardTemplateDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  role: string;
  kraIds: mongoose.Types.ObjectId[];
  approvalStatus: "draft" | "approved";
  createdAt: Date;
  updatedAt: Date;
}

const ScorecardTemplateSchema = new Schema<ScorecardTemplateDoc>(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    kraIds: [{ type: Schema.Types.ObjectId, ref: "KraCatalog" }],
    approvalStatus: { type: String, default: "approved" },
  },
  { timestamps: true },
);

export const ScorecardTemplate =
  models.ScorecardTemplate || model<ScorecardTemplateDoc>("ScorecardTemplate", ScorecardTemplateSchema);

export interface KpiResultDoc {
  _id: mongoose.Types.ObjectId;
  kpiId: mongoose.Types.ObjectId;
  kpiKey: string;
  subjectType: "member" | "team" | "project";
  subjectId: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  actualValue: number | null;
  target: number;
  achievementPct: number | null;
  score: number | null;
  rag: string;
  insufficientData: boolean;
  source: "calculated" | "manual" | "override";
  evidence?: string;
  reason?: string;
  approverId?: mongoose.Types.ObjectId | null;
  exception?: string;
  calculationVersion: string;
  cutoffDate: Date;
  refreshTimestamp: Date;
  sampleSize: number;
  guardrailApplied?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KpiResultSchema = new Schema<KpiResultDoc>(
  {
    kpiId: { type: Schema.Types.ObjectId, ref: "KpiCatalog", required: true },
    kpiKey: String,
    subjectType: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true, index: true },
    periodStart: Date,
    periodEnd: Date,
    actualValue: Number,
    target: Number,
    achievementPct: Number,
    score: Number,
    rag: String,
    insufficientData: { type: Boolean, default: false },
    source: { type: String, default: "calculated" },
    evidence: String,
    reason: String,
    approverId: { type: Schema.Types.ObjectId, ref: "User" },
    exception: String,
    calculationVersion: String,
    cutoffDate: Date,
    refreshTimestamp: Date,
    sampleSize: Number,
    guardrailApplied: { type: Boolean, default: false },
  },
  { timestamps: true },
);

KpiResultSchema.index({ subjectId: 1, periodStart: 1, kpiKey: 1 });

export const KpiResult = models.KpiResult || model<KpiResultDoc>("KpiResult", KpiResultSchema);

export interface ScorecardDoc {
  _id: mongoose.Types.ObjectId;
  subjectType: "member" | "team" | "project";
  subjectId: mongoose.Types.ObjectId;
  role: string;
  periodStart: Date;
  periodEnd: Date;
  dataCutoff: Date;
  kras: {
    kraId: mongoose.Types.ObjectId;
    name: string;
    weight: number;
    score: number | null;
    kpiResultIds: mongoose.Types.ObjectId[];
  }[];
  overallScore: number | null;
  managerComments: string;
  qualitativeAssessment: string;
  lockStatus: "open" | "locked";
  approvalStatus: "draft" | "pending" | "approved" | "correction";
  reviewerId?: mongoose.Types.ObjectId | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ScorecardSchema = new Schema<ScorecardDoc>(
  {
    subjectType: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true, index: true },
    role: String,
    periodStart: Date,
    periodEnd: Date,
    dataCutoff: Date,
    kras: [
      {
        kraId: { type: Schema.Types.ObjectId, ref: "KraCatalog" },
        name: String,
        weight: Number,
        score: Number,
        kpiResultIds: [{ type: Schema.Types.ObjectId, ref: "KpiResult" }],
      },
    ],
    overallScore: Number,
    managerComments: { type: String, default: "" },
    qualitativeAssessment: { type: String, default: "" },
    lockStatus: { type: String, default: "open" },
    approvalStatus: { type: String, default: "draft" },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
  },
  { timestamps: true },
);

ScorecardSchema.index({ subjectId: 1, periodStart: 1 });
ScorecardSchema.index({ lockStatus: 1, approvalStatus: 1 });

export const Scorecard = models.Scorecard || model<ScorecardDoc>("Scorecard", ScorecardSchema);
