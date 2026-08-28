import { acceptInviteAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/fields";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const action = acceptInviteAction.bind(null, token);
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <Field label="New password">
              <Input name="password" type="password" minLength={8} required />
            </Field>
            <Button type="submit">Activate account</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
