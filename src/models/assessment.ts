import mongoose, { Schema, models, model } from "mongoose";

export interface AssessmentDoc {
  _id: mongoose.Types.ObjectId;
  deliverableId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  dimensions: {
    key: string;
    label: string;
    weight: number;
    score: number;
    comments: string;
    evidenceUrl?: string;
  }[];
  overallScore: number;
  reviewerId: mongoose.Types.ObjectId;
  reviewDate: Date;
  comments: string;
  evidenceUrl?: string;
  reworkActions?: string;
  revisedDueDate?: Date | null;
  previousId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<AssessmentDoc>(
  {
    deliverableId: { type: Schema.Types.ObjectId, ref: "WorkItem", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    dimensions: [
      {
        key: String,
        label: String,
        weight: Number,
        score: Number,
        comments: String,
        evidenceUrl: String,
      },
    ],
    overallScore: { type: Number, required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewDate: { type: Date, default: Date.now },
    comments: { type: String, default: "" },
    evidenceUrl: String,
    reworkActions: String,
    revisedDueDate: Date,
    previousId: { type: Schema.Types.ObjectId, ref: "Assessment", default: null },
  },
  { timestamps: true },
);

export const Assessment = models.Assessment || model<AssessmentDoc>("Assessment", AssessmentSchema);

export interface StatusReportDoc {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  accomplishments: string;
  nextPeriodPlans: string;
  blockers: string;
  decisionsNeeded: string;
  risks: string;
  overallHealth: string;
  submittedAt?: Date | null;
  submittedBy?: mongoose.Types.ObjectId | null;
  onTime: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StatusReportSchema = new Schema<StatusReportDoc>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    periodStart: Date,
    periodEnd: Date,
    accomplishments: { type: String, default: "" },
    nextPeriodPlans: { type: String, default: "" },
    blockers: { type: String, default: "" },
    decisionsNeeded: { type: String, default: "" },
    risks: { type: String, default: "" },
    overallHealth: { type: String, default: "amber" },
    submittedAt: Date,
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    onTime: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const StatusReport =
  models.StatusReport || model<StatusReportDoc>("StatusReport", StatusReportSchema);
