import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { KpiResult, Scorecard } from "@/models/kpi";
import { User, Team } from "@/models/user";
import { WorkItem } from "@/models/work-item";
import { Project } from "@/models/project";
import { canViewIndividualScorecard } from "@/lib/rbac";
import { approveScorecardForm, correctScorecardForm, overrideKpiForm } from "@/lib/actions/scorecards";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, RagBadge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { CALCULATION_VERSION, SCORE_LABELS } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { hasPermission } from "@/lib/rbac";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { computeFormula } from "@/lib/engines/kpi";

export default async function ScorecardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await connectDB();
  const scorecard = await Scorecard.findById(id);
  if (!scorecard) notFound();
  const subject = scorecard.subjectType === "member" ? await User.findById(scorecard.subjectId) : null;
  const team = scorecard.subjectType === "team" ? await Team.findById(scorecard.subjectId) : null;
  const project = scorecard.subjectType === "project" ? await Project.findById(scorecard.subjectId) : null;
  if (
    scorecard.subjectType === "member" &&
    !canViewIndividualScorecard({
      viewerId: user.id,
      viewerRole: user.role,
      subjectId: String(scorecard.subjectId),
      managerId: subject?.managerId ? String(subject.managerId) : null,
    })
  ) {
    notFound();
  }
  const resultIds = scorecard.kras.flatMap((k: { kpiResultIds: unknown[] }) => k.kpiResultIds);
  const results = await KpiResult.find({ _id: { $in: resultIds } });
  const teamMemberIds = team?.memberIds?.map((id: unknown) => String(id)) ?? [];
  const work =
    scorecard.subjectType === "member"
      ? await WorkItem.find({ assigneeId: scorecard.subjectId, deletedAt: null }).lean()
      : scorecard.subjectType === "project"
        ? await WorkItem.find({ projectId: scorecard.subjectId, deletedAt: null }).lean()
        : await WorkItem.find({ assigneeId: { $in: teamMemberIds }, deletedAt: null }).lean();
  const snapshots = work.map((i) => ({
    type: i.type,
    status: i.status,
    plannedEffort: i.plannedEffort,
    assigneeId: i.assigneeId ? String(i.assigneeId) : null,
  }));
  const ticketCount = computeFormula("ticket_count", snapshots);
  const storyPoints = computeFormula("story_points", snapshots);
  const approve = approveScorecardForm.bind(null, id);
  const correct = correctScorecardForm.bind(null, id);
  return (
    <>
      <PageHeader
        title={`${subject?.name ?? team?.name ?? (project ? `${project.code} ${project.name}` : "Scorecard")}`}
        description={`${scorecard.role} · ${fmtDate(scorecard.periodStart)} – ${fmtDate(scorecard.periodEnd)} · cutoff ${fmtDate(scorecard.dataCutoff)} · calc ${CALCULATION_VERSION}`}
      />
      <p className="mb-4 text-sm text-muted-foreground">
        Formal scores use balanced KRAs. Ticket volume and story points are operational only (BRULE-11) and never auto-finalize a rating.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>Overall {scorecard.overallScore ?? "insufficient data"}</Badge>
        <Badge tone={scorecard.lockStatus === "locked" ? "green" : "amber"}>
          {scorecard.lockStatus} / {scorecard.approvalStatus}
        </Badge>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Operational indicators (not used in the formal rating)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6 text-sm">
          <div>Ticket / task count: {ticketCount.value ?? 0}</div>
          <div>Story points / planned effort: {storyPoints.value ?? 0}</div>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {scorecard.kras.map((kra: { kraId: unknown; name: string; weight: number; score: number | null; kpiResultIds: unknown[] }) => (
          <Card key={String(kra.kraId)}>
            <CardHeader>
              <CardTitle>
                {kra.name} ({kra.weight}%) — {kra.score ?? "insufficient data"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {results
                .filter((r) => kra.kpiResultIds.some((kid: unknown) => String(kid) === String(r._id)))
                .map((r) => {
                  const override = overrideKpiForm.bind(null, String(r._id));
                  return (
                    <div key={String(r._id)} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{r.kpiKey}</span>
                        <RagBadge value={r.rag} />
                      </div>
                      {r.insufficientData ? (
                        <Badge tone="slate">insufficient data (min sample not met)</Badge>
                      ) : (
                        <p>
                          Actual {r.actualValue ?? "—"} / target {r.target} · achievement {r.achievementPct ?? "—"}% ·
                          score {r.score}
                          {r.score ? ` (${SCORE_LABELS[r.score] ?? ""})` : ""} · source {r.source} · n={r.sampleSize}
                        </p>
                      )}
                      {r.guardrailApplied ? (
                        <Badge tone="amber">quality guardrail capped this rating at 3</Badge>
                      ) : null}
                      <p className="text-muted-foreground">
                        Refresh {fmtDate(r.refreshTimestamp)} · version {r.calculationVersion} · cutoff{" "}
                        {fmtDate(r.cutoffDate)}
                      </p>
                      {r.exception ? (
                        <p className="text-amber-800">Contextual exception: {r.exception}</p>
                      ) : null}
                      {r.source === "override" ? (
                        <p className="text-muted-foreground">
                          Override evidence: {r.evidence} · {r.reason}
                        </p>
                      ) : null}
                      {scorecard.lockStatus === "open" && hasPermission(user.role, "overrideKpi") ? (
                        <ActionForm action={override} className="mt-2 grid gap-2 md:grid-cols-2">
                          <Input name="actualValue" type="number" step="0.1" defaultValue={r.actualValue ?? ""} />
                          <Input name="reason" placeholder="Reason (required)" required />
                          <Input name="evidence" placeholder="Evidence URL (required)" required />
                          <Input name="exception" placeholder="Leave / scope / dependency note" />
                          <SubmitButton size="sm" variant="outline">
                            Override with evidence
                          </SubmitButton>
                        </ActionForm>
                      ) : null}
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ))}
        {scorecard.lockStatus === "open" ? (
          <Card>
            <CardHeader>
              <CardTitle>Manager review (required before final rating)</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={approve} className="grid gap-3">
                <Field label="Manager comments">
                  <Textarea name="managerComments" required defaultValue={scorecard.managerComments} />
                </Field>
                <Field label="Qualitative assessment">
                  <Textarea name="qualitativeAssessment" required defaultValue={scorecard.qualitativeAssessment} />
                </Field>
                <SubmitButton>Approve & lock</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        ) : hasPermission(user.role, "correctLockedScorecard") ? (
          <ActionForm action={correct} className="grid max-w-md gap-2">
            <Textarea name="reason" placeholder="Authorized correction reason" />
            <SubmitButton variant="outline">Unlock for audited correction</SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted-foreground">Period is locked. Corrections require PMO/HR.</p>
        )}
      </div>
    </>
  );
}
