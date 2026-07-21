import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";
import { useState, useEffect } from "react";

interface Signing {
  id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  location: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  status: string;
  notes: string | null;
  sharing_enabled: boolean;
  created_at: string;
}

const getSignings = createServerFn({ method: "GET" }).handler(async (): Promise<Signing[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await sql()`
    SELECT id, title, client_name, client_email, location,
           scheduled_at, completed_at, status, notes, sharing_enabled, created_at
    FROM signings
    WHERE user_id = ${user.id}
    ORDER BY
      CASE WHEN status = 'scheduled' THEN 0 ELSE 1 END,
      scheduled_at ASC NULLS LAST
  `;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    title: String(r.title),
    client_name: r.client_name ? String(r.client_name) : null,
    client_email: r.client_email ? String(r.client_email) : null,
    location: r.location ? String(r.location) : null,
    scheduled_at: r.scheduled_at ? String(r.scheduled_at) : null,
    completed_at: r.completed_at ? String(r.completed_at) : null,
    status: String(r.status),
    notes: r.notes ? String(r.notes) : null,
    sharing_enabled: Boolean(r.sharing_enabled),
    created_at: String(r.created_at),
  }));
});

export const Route = createFileRoute("/dashboard/schedule/")({
  loader: () => getSignings(),
  component: ScheduleListPage,
});

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ScheduleListPage() {
  const signings = Route.useLoaderData();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const upcoming = signings.filter((s) => s.status === "scheduled");
  const past = signings.filter((s) => s.status === "completed" || s.status === "cancelled");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="mt-1 text-gray-600">Manage your signing appointments.</p>
        </div>
        <Link
          to="/dashboard/schedule/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <span aria-hidden="true">+</span> New Signing
        </Link>
      </div>

      {!loaded ? (
        <div className="mt-8 text-center text-gray-400">Loading...</div>
      ) : signings.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-lg font-medium text-gray-500">No signings yet.</p>
          <p className="mt-1 text-gray-400">Schedule your first one!</p>
          <Link
            to="/dashboard/schedule/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New Signing
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Upcoming */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              Upcoming{" "}
              <span className="text-sm font-normal text-gray-500">
                ({upcoming.length})
              </span>
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No upcoming signings.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {upcoming.map((s) => (
                  <Link
                    key={s.id}
                    to="/dashboard/schedule/$id"
                    params={{ id: s.id }}
                    className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {s.title}
                        </h3>
                        {s.client_name && (
                          <p className="mt-0.5 text-sm text-gray-600">
                            {s.client_name}
                          </p>
                        )}
                        {s.location && (
                          <p className="mt-0.5 text-sm text-gray-500 flex items-center gap-1">
                            <span aria-hidden="true">📍</span> {s.location}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">
                          {formatDateTime(s.scheduled_at)}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {s.sharing_enabled && (
                          <span title="Shared with client" className="text-indigo-500 text-sm">🔗</span>
                        )}
                        {statusBadge(s.status)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Past */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              Past{" "}
              <span className="text-sm font-normal text-gray-500">
                ({past.length})
              </span>
            </h2>
            {past.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No past signings.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {past.map((s) => (
                  <Link
                    key={s.id}
                    to="/dashboard/schedule/$id"
                    params={{ id: s.id }}
                    className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {s.title}
                        </h3>
                        {s.client_name && (
                          <p className="mt-0.5 text-sm text-gray-600">
                            {s.client_name}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">
                          {formatDateTime(s.scheduled_at)}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {s.sharing_enabled && (
                          <span title="Shared with client" className="text-indigo-500 text-sm">🔗</span>
                        )}
                        {statusBadge(s.status)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
