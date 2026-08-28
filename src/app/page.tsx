import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { postLoginPath } from "@/lib/rbac";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(postLoginPath(session.user.role));
}
