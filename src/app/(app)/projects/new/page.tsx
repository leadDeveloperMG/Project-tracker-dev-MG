import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { ProjectTemplate } from "@/models/project";
import { User } from "@/models/user";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function NewProjectPage() {
  await requirePermission("createProject");
  await connectDB();
  const templates = await ProjectTemplate.find({ active: true });
  const users = await User.find({ active: true }).sort({ name: 1 });
  return (
    <>
      <PageHeader
        title="Create project"
        description="Start from an approved template. Charter fields are required before the project can move to In Progress."
      />
      <Card>
        <CardContent>
          <CreateProjectForm
            templates={templates.map((t) => ({ id: String(t._id), name: t.name }))}
            users={users.map((u) => ({ id: String(u._id), name: u.name }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
