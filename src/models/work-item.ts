import mongoose, { Schema, models, model } from "mongoose";
import type { LinkType, Priority, WorkType } from "@/lib/constants";

export interface WorkItemDoc {
  _id: mongoose.Types.ObjectId;
  key: string;
  projectId: mongoose.Types.ObjectId;
  type: WorkType;
  title: string;
  description: string;
  parentId?: mongoose.Types.ObjectId | null;
  assigneeId?: mongoose.Types.ObjectId | null;
  approverId?: mongoose.Types.ObjectId | null;
  status: string;
  priority: Priority;
  plannedDate?: Date | null;
  baselineDate?: Date | null;
  forecastDate?: Date | null;
  actualDate?: Date | null;
  dueDate?: Date | null;
  plannedEffort?: number | null;
  actualEffort?: number | null;
  acceptanceCriteria: string;
  progressMode: "child-item" | "weighted-completion" | "manual";
  progress: number;
  progressWeight: number;
  committed: boolean;
  firstPassAccepted: boolean;
  reworkCount: number;
  reviewed: boolean;
  blocked: boolean;
  blockerOpenedAt?: Date | null;
  blockerResolvedAt?: Date | null;
  flags: {
    overdue: boolean;
    blocked: boolean;
    unassigned: boolean;
    stale: boolean;
    missingData: boolean;
  };
  links: { type: LinkType; targetId: mongoose.Types.ObjectId }[];
  attachments: { name: string; url: string; uploadedBy: mongoose.Types.ObjectId; uploadedAt: Date }[];
  comments: { authorId: mongoose.Types.ObjectId; body: string; createdAt: Date }[];
  likelihood?: number;
  impact?: number;
  exposure?: number;
  mitigation?: string;
  proximity?: string;
  decision?: string;
  selfAcceptException: boolean;
  jiraKey?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const WorkItemSchema = new Schema<WorkItemDoc>(
  {
    key: { type: String, required: true, unique: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    parentId: { type: Schema.Types.ObjectId, ref: "WorkItem", default: null },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    approverId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, required: true, index: true },
    priority: { type: String, default: "Medium" },
    plannedDate: Date,
    baselineDate: Date,
    forecastDate: Date,
    actualDate: Date,
    dueDate: { type: Date, index: true },
    plannedEffort: Number,
    actualEffort: Number,
    acceptanceCriteria: { type: String, default: "" },
    progressMode: { type: String, default: "child-item" },
    progress: { type: Number, default: 0 },
    progressWeight: { type: Number, default: 1 },
    committed: { type: Boolean, default: false },
    firstPassAccepted: { type: Boolean, default: false },
    reworkCount: { type: Number, default: 0 },
    reviewed: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    blockerOpenedAt: Date,
    blockerResolvedAt: Date,
    flags: {
      overdue: { type: Boolean, default: false },
      blocked: { type: Boolean, default: false },
      unassigned: { type: Boolean, default: false },
      stale: { type: Boolean, default: false },
      missingData: { type: Boolean, default: false },
    },
    links: [{ type: { type: String }, targetId: { type: Schema.Types.ObjectId, ref: "WorkItem" } }],
    attachments: [
      {
        name: String,
        url: String,
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: "User" },
        body: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    likelihood: Number,
    impact: Number,
    exposure: Number,
    mitigation: String,
    proximity: String,
    decision: String,
    selfAcceptException: { type: Boolean, default: false },
    jiraKey: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

WorkItemSchema.index({ projectId: 1, type: 1, status: 1 });
WorkItemSchema.index({ "flags.overdue": 1 });

export const WorkItem = models.WorkItem || model<WorkItemDoc>("WorkItem", WorkItemSchema);
