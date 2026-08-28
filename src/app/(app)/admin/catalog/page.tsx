import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { KraCatalog, KpiCatalog } from "@/models/kpi";
import { PageHeader } from "@/components/page-header";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveKpiForm, saveKraForm } from "@/lib/actions/admin";
import { KPI_DIRECTIONS, MEASUREMENT_PERIODS, ROLES, ROLE_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/action-form";

export default async function CatalogPage() {
  await requirePermission("manageCatalog");
  await connectDB();
  const kras = await KraCatalog.find({}).lean();
  const kpis = await KpiCatalog.find({}).lean();
  return (
    <div>
      <PageHeader
        title="KRA / KPI catalog"
        description="Unapproved KPIs cannot be used on formal scorecards. Weights must total 100% per owner type. Ticket count and story points are operational only (BRULE-11) and cannot be approved onto a formal scorecard."
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ActionForm action={saveKraForm} className="space-y-3 rounded-xl border bg-white p-5">
          <h2 className="font-medium">Add KRA</h2>
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Description">
            <Textarea name="description" />
          </Field>
          <Field label="Applicable role">
            <Select name="applicableRole" defaultValue="team_member">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Weight %">
            <Input name="weight" type="number" defaultValue={25} />
          </Field>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="weightException" /> Policy exception for weight total
          </label>
          <SubmitButton>Save KRA</SubmitButton>
        </ActionForm>
        <ActionForm action={saveKpiForm} className="space-y-3 rounded-xl border bg-white p-5">
          <h2 className="font-medium">Add KPI</h2>
          <Field label="KRA">
            <Select name="kraId">
              {kras.map((k) => (
                <option key={String(k._id)} value={String(k._id)}>
                  {k.name} ({k.applicableRole})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Key / formula">
            <Select name="key" defaultValue="on_time_deliverable_rate">
              <option value="on_time_deliverable_rate">on_time_deliverable_rate</option>
              <option value="milestone_adherence">milestone_adherence</option>
              <option value="commitment_completion">commitment_completion</option>
              <option value="first_pass_acceptance">first_pass_acceptance</option>
              <option value="rework_rate">rework_rate (lower is better)</option>
              <option value="blocker_resolution_time">blocker_resolution_time (lower is better)</option>
              <option value="status_report_compliance">status_report_compliance</option>
              <option value="high_risk_exposure">high_risk_exposure (lower is better)</option>
              <option value="stakeholder_satisfaction">stakeholder_satisfaction (manual)</option>
              <option value="ticket_count">ticket_count (operational only)</option>
              <option value="story_points">story_points (operational only)</option>
            </Select>
          </Field>
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Owner type">
            <Select name="ownerType" defaultValue="member">
              <option value="member">member</option>
              <option value="team">team</option>
              <option value="project">project</option>
            </Select>
          </Field>
          <Field label="Target">
            <Input name="target" type="number" defaultValue={90} />
          </Field>
          <Field label="Green ≥ / ≤">
            <Input name="green" type="number" defaultValue={90} />
          </Field>
          <Field label="Amber ≥ / ≤">
            <Input name="amber" type="number" defaultValue={80} />
          </Field>
          <Field label="Weight % under KRA">
            <Input name="weight" type="number" defaultValue={100} />
          </Field>
          <Field label="Direction">
            <Select name="direction" defaultValue="higher-is-better">
              {KPI_DIRECTIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Period">
            <Select name="measurementPeriod" defaultValue="quarterly">
              {MEASUREMENT_PERIODS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Min sample size">
            <Input name="minSampleSize" type="number" defaultValue={3} />
          </Field>
          <Field label="Quality guardrail metric">
            <Select name="guardrailMetric" defaultValue="">
              <option value="">None</option>
              <option value="rework_rate">Cap high ratings if rework_rate exceeds max</option>
              <option value="first_pass_acceptance">Cap high ratings if first-pass is below min</option>
            </Select>
          </Field>
          <Field label="Guardrail min">
            <Input name="guardrailMin" type="number" />
          </Field>
          <Field label="Guardrail max">
            <Input name="guardrailMax" type="number" />
          </Field>
          <Field label="Approval">
            <Select name="approvalStatus" defaultValue="approved">
              <option>approved</option>
              <option>draft</option>
              <option>retired</option>
            </Select>
          </Field>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="weightException" /> Policy exception for weight total
          </label>
          <SubmitButton>Save KPI</SubmitButton>
        </ActionForm>
      </div>
      <h2 className="mb-2 font-medium">Catalog</h2>
      <div className="space-y-2">
        {kras.length === 0 ? <p className="text-sm text-muted-foreground">No KRAs yet.</p> : null}
        {kras.map((k) => (
          <div key={String(k._id)} className="rounded-xl border bg-white p-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{k.name}</span>
              <StatusBadge status={k.approvalStatus} />
              <span className="text-muted-foreground">
                {k.applicableRole} · {k.weight}%
              </span>
            </div>
            <ul className="mt-2 space-y-3 text-muted-foreground">
              {kpis
                .filter((p) => String(p.kraId) === String(k._id))
                .map((p) => (
                  <li key={String(p._id)}>
                    <p>
                      {p.name} ({p.key}) · {p.ownerType} · {p.direction} · target {p.target} · n≥{p.minSampleSize} ·{" "}
                      {p.approvalStatus}
                      {p.qualityGuardrail?.metric ? ` · guardrail ${p.qualityGuardrail.metric}` : ""}
                    </p>
                    <ActionForm action={saveKpiForm} className="mt-2 grid gap-2 md:grid-cols-6">
                      <input type="hidden" name="id" value={String(p._id)} />
                      <input type="hidden" name="kraId" value={String(p.kraId)} />
                      <input type="hidden" name="key" value={p.key} />
                      <input type="hidden" name="description" value={p.description ?? ""} />
                      <input type="hidden" name="measurementPeriod" value={p.measurementPeriod} />
                      <input type="hidden" name="direction" value={p.direction} />
                      <input type="hidden" name="minSampleSize" value={p.minSampleSize} />
                      {p.qualityGuardrail?.metric ? (
                        <>
                          <input type="hidden" name="guardrailMetric" value={p.qualityGuardrail.metric} />
                          {p.qualityGuardrail.min != null ? (
                            <input type="hidden" name="guardrailMin" value={p.qualityGuardrail.min} />
                          ) : null}
                          {p.qualityGuardrail.max != null ? (
                            <input type="hidden" name="guardrailMax" value={p.qualityGuardrail.max} />
                          ) : null}
                        </>
                      ) : null}
                      <Input name="name" defaultValue={p.name} />
                      <Select name="ownerType" defaultValue={p.ownerType}>
                        <option value="member">member</option>
                        <option value="team">team</option>
                        <option value="project">project</option>
                      </Select>
                      <Input name="target" type="number" defaultValue={p.target} />
                      <Input name="green" type="number" defaultValue={p.thresholdBands.green} />
                      <Input name="amber" type="number" defaultValue={p.thresholdBands.amber} />
                      <Input name="weight" type="number" defaultValue={p.weight} />
                      <Select name="approvalStatus" defaultValue={p.approvalStatus}>
                        <option>approved</option>
                        <option>draft</option>
                        <option>retired</option>
                      </Select>
                      <SubmitButton size="sm" variant="outline">
                        Update KPI
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
            </ul>
            <ActionForm action={saveKraForm} className="mt-3 grid gap-2 md:grid-cols-4">
              <input type="hidden" name="id" value={String(k._id)} />
              <input type="hidden" name="applicableRole" value={k.applicableRole} />
              <input type="hidden" name="description" value={k.description} />
              <input type="hidden" name="ownerRole" value={k.ownerRole} />
              <input type="hidden" name="period" value={k.period} />
              <Input name="name" defaultValue={k.name} />
              <Input name="weight" type="number" defaultValue={k.weight} />
              <Select name="approvalStatus" defaultValue={k.approvalStatus}>
                <option>approved</option>
                <option>draft</option>
                <option>retired</option>
              </Select>
              <SubmitButton size="sm" variant="outline">
                Update KRA
              </SubmitButton>
            </ActionForm>
          </div>
        ))}
      </div>
    </div>
  );
}
