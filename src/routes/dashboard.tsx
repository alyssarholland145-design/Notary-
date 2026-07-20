import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser, deleteCurrentSession } from "~/lib/auth";

const logoutAction = createServerFn({ method: "POST" }).handler(async () => {
  await deleteCurrentSession();
  throw redirect({ to: "/login" });
});

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user } = Route.useRouteContext();
  const currentPath = "/dashboard"; // Will be refined by sub-routes

  const navItems = [
    { label: "Schedule", icon: "📅", to: "/dashboard/schedule" },
    { label: "Journal", icon: "📓", to: "/dashboard/journal" },
    { label: "Invoices", icon: "💰", to: "/dashboard/invoices" },
    { label: "Settings", icon: "⚙️", to: "/dashboard/settings" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-gray-900 text-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-700 px-4">
          <span className="text-lg font-bold">SignWell</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white [&.active]:bg-gray-800 [&.active]:text-white"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h2 className="text-sm font-medium text-gray-700">
            Welcome, {user.full_name}
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await logoutAction();
              } catch {
                // Redirect throws
              }
            }}
          >
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              Log out
            </button>
          </form>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
