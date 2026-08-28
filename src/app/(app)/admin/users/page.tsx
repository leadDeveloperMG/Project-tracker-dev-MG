import { requirePermission } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User, Team } from "@/models/user";
import { PageHeader } from "@/components/page-header";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { createTeamAction, updateUserAction } from "@/lib/actions/admin";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/badge";
import { InviteUserForm } from "@/components/phase1-forms";

export default async function UsersAdminPage() {
  await requirePermission("manageUsers");
  await connectDB();
  const users = await User.find({}).sort({ name: 1 });
  const teams = await Team.find({});
  const userOpts = users.map((u) => ({ id: String(u._id), name: u.name }));

  return (
    <div>
      <PageHeader
        title="Users & teams"
        description="Role-based access. Invites expire in 7 days if no password is set."
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <InviteUserForm users={userOpts} />
        <form action={createTeamAction} className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="font-medium">Create team</h2>
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Functional area">
            <Input name="functionalArea" />
          </Field>
          <Field label="Manager">
            <Select name="managerId">
              <option value="">None</option>
              {users.map((u) => (
                <option key={String(u._id)} value={String(u._id)}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Members">
            <div className="grid max-h-40 gap-1 overflow-auto rounded-lg border p-2 text-sm">
              {users.map((u) => (
                <label key={String(u._id)} className="flex items-center gap-2">
                  <input type="checkbox" name="memberIds" value={String(u._id)} />
                  {u.name}
                </label>
              ))}
            </div>
          </Field>
          <Button type="submit">Create team</Button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u._id)} className="border-t">
                <td className="px-3 py-2" colSpan={6}>
                  <form action={updateUserAction} className="grid items-end gap-2 md:grid-cols-6">
                    <input type="hidden" name="id" value={String(u._id)} />
                    <Field label="Name">
                      <Input name="name" defaultValue={u.name} />
                    </Field>
                    <div className="px-1 py-2 text-muted-foreground">{u.email}</div>
                    <Field label="Role">
                      <Select name="role" defaultValue={u.role}>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Manager">
                      <Select name="managerId" defaultValue={u.managerId ? String(u.managerId) : ""}>
                        <option value="">None</option>
                        {users
                          .filter((m) => String(m._id) !== String(u._id))
                          .map((m) => (
                            <option key={String(m._id)} value={String(m._id)}>
                              {m.name}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={u.active} />
                      Active <StatusBadge status={u.active ? "active" : "inactive"} />
                    </label>
                    <Button type="submit" size="sm" variant="outline">
                      Save
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 text-sm text-muted-foreground">
        {teams.map((t) => (
          <li key={String(t._id)}>
            Team: {t.name} · {t.functionalArea} · {t.memberIds.length} members
          </li>
        ))}
      </ul>
    </div>
  );
}
