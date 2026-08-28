import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { assertProjectAccess } from "@/lib/access";
import { overrideHealthFormAction } from "@/lib/actions/projects";
import { hasPermission } from "@/lib/rbac";
import { PageHeader, ProjectNav } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RagBadge } from "@/components/ui/badge";
import { Field, Select, Textarea } from "@/components/ui/fields";
import { HEALTH_DIMENSIONS, RAG } from "@/lib/constants";
import { ActionForm, SubmitButton } from "@/components/action-form";

export default async function HealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await assertProjectAccess(user, id).catch(() => null);
  if (!project) notFound();
  const action = overrideHealthFormAction.bind(null, id);
  return (
    <>
      <PageHeader title="Project health" description="Calculated RAG with manager override + rationale (FR-030/031)." />
      <ProjectNav id={id} />
      <div className="grid gap-4 md:grid-cols-2">
        {HEALTH_DIMENSIONS.map((dim) => {
          const cell = project.health?.[dim];
          return (
            <Card key={dim}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between capitalize">
                  {dim} <RagBadge value={cell?.rag} />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <p>Score {cell?.score ?? "—"} · {cell?.source}</p>
                {cell?.rationale ? <p className="text-muted-foreground">{cell.rationale}</p> : null}
                {hasPermission(user.role, "overrideHealth") ? (
                  <ActionForm action={action} className="grid gap-2">
                    <input type="hidden" name="dimension" value={dim} />
                    <Field label="Override RAG">
                      <Select name="rag" defaultValue={cell?.rag ?? "amber"}>
                        {RAG.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </Select>
                    </Field>
                    <Textarea name="rationale" placeholder="Mandatory rationale" />
                    <SubmitButton size="sm" variant="outline">
                      Override
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <p className="text-muted-foreground">Calculated recommendation only.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
