import mongoose, { Schema, models, model } from "mongoose";

export interface CheckInDoc {
  _id: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  date: Date;
  progressNotes: string;
  feedback: string;
  constraints: string;
  developmentActions: string;
  followUpDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CheckInSchema = new Schema<CheckInDoc>(
  {
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, default: Date.now },
    progressNotes: { type: String, default: "" },
    feedback: { type: String, default: "" },
    constraints: { type: String, default: "" },
    developmentActions: { type: String, default: "" },
    followUpDate: Date,
  },
  { timestamps: true },
);

export const CheckIn = models.CheckIn || model<CheckInDoc>("CheckIn", CheckInSchema);

export interface CalibrationRecordDoc {
  _id: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  population: string;
  reviewerGroup: string;
  ratingDistribution: Record<string, number>;
  decisions: string;
  rationale: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CalibrationSchema = new Schema<CalibrationRecordDoc>(
  {
    periodStart: Date,
    periodEnd: Date,
    population: String,
    reviewerGroup: String,
    ratingDistribution: { type: Schema.Types.Mixed, default: {} },
    decisions: String,
    rationale: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const CalibrationRecord =
  models.CalibrationRecord || model<CalibrationRecordDoc>("CalibrationRecord", CalibrationSchema);

export interface AnnualReviewDoc {
  _id: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  year: number;
  consolidatedScore: number | null;
  managerComments: string;
  qualitativeEvidence: string;
  developmentOutcomes: string;
  futureGoals: string;
  approvalStatus: "draft" | "pending" | "approved";
  reviewerId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AnnualReviewSchema = new Schema<AnnualReviewDoc>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    year: { type: Number, required: true },
    consolidatedScore: Number,
    managerComments: { type: String, default: "" },
    qualitativeEvidence: { type: String, default: "" },
    developmentOutcomes: { type: String, default: "" },
    futureGoals: { type: String, default: "" },
    approvalStatus: { type: String, default: "draft" },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const AnnualReview =
  models.AnnualReview || model<AnnualReviewDoc>("AnnualReview", AnnualReviewSchema);

export interface NotificationDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<NotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: String,
    title: String,
    body: String,
    href: String,
    read: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Notification =
  models.Notification || model<NotificationDoc>("Notification", NotificationSchema);

export interface ScheduledReportDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  reportType: string;
  recipientIds: mongoose.Types.ObjectId[];
  cadence: string;
  lastSentAt?: Date | null;
  active: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledReportSchema = new Schema<ScheduledReportDoc>(
  {
    name: String,
    reportType: String,
    recipientIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    cadence: { type: String, default: "weekly" },
    lastSentAt: Date,
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const ScheduledReport =
  models.ScheduledReport || model<ScheduledReportDoc>("ScheduledReport", ScheduledReportSchema);

export interface RetentionPolicyDoc {
  _id: mongoose.Types.ObjectId;
  entityType: string;
  retainDays: number;
  action: "archive" | "delete";
  updatedBy?: mongoose.Types.ObjectId | null;
  updatedAt: Date;
}

const RetentionPolicySchema = new Schema<RetentionPolicyDoc>(
  {
    entityType: { type: String, required: true, unique: true },
    retainDays: { type: Number, default: 2555 },
    action: { type: String, default: "archive" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const RetentionPolicy =
  models.RetentionPolicy || model<RetentionPolicyDoc>("RetentionPolicy", RetentionPolicySchema);
