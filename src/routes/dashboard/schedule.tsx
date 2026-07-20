import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "~/lib/auth";

export const Route = createFileRoute("/dashboard/schedule")({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  component: ScheduleLayout,
});

function ScheduleLayout() {
  return <Outlet />;
}
