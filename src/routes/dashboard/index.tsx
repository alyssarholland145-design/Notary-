import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "~/lib/auth";

export const Route = createFileRoute("/dashboard/")({
  loader: () => getCurrentUser(),
  component: DashboardIndex,
});

function DashboardIndex() {
  const user = Route.useLoaderData();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome{user?.full_name ? `, ${user.full_name}` : ""}!
      </h1>
      <p className="mt-1 text-gray-600">
        Here&apos;s an overview of your notary business.
      </p>

      {/* Stats placeholder */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Upcoming Signings</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Completed This Month</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pending Invoices</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/dashboard/journal"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            📓 New Journal Entry
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            📅 Schedule Signing
          </button>
        </div>
      </div>
    </div>
  );
}
