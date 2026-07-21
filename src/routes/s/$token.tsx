import { createFileRoute } from "@tanstack/react-router";
import { getSigningByToken } from "~/lib/sharing";
import type { SharedSigning } from "~/lib/sharing";

export const Route = createFileRoute("/s/$token")({
  loader: async ({ params }) => {
    const signing = await getSigningByToken({ data: { token: params.token } });
    return { signing, token: params.token };
  },
  component: ClientViewPage,
  notFoundComponent: NotFoundPage,
});

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Signing Not Found
        </h1>
        <p className="mt-2 text-gray-500">
          This link may be invalid, expired, or the notary has disabled sharing
          for this signing.
        </p>
        <p className="mt-8 text-xs text-gray-400">
          Powered by{" "}
          <span className="font-semibold text-indigo-600">SignWell</span>
        </p>
      </div>
    </div>
  );
}

function ClientViewPage() {
  const { signing } = Route.useLoaderData();

  if (!signing) {
    return <NotFoundPage />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold text-indigo-600">SignWell</span>
          <span className="text-xs text-gray-400">Client Portal</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {signing.title}
            </h1>
            <p className="mt-1 text-gray-500">{formatDateTime(signing.scheduled_at)}</p>
          </div>
          <div className="shrink-0">{statusBadge(signing.status)}</div>
        </div>

        {/* Details card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <dl className="grid gap-5 sm:grid-cols-2">
            {signing.client_name && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Client
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {signing.client_name}
                </dd>
              </div>
            )}
            {signing.client_email && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {signing.client_email}
                </dd>
              </div>
            )}
            {signing.location && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Location
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {signing.location}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Status
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {signing.status.charAt(0).toUpperCase() +
                  signing.status.slice(1)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-gray-100 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Prepared by{" "}
            <span className="font-semibold text-gray-700">
              {signing.notary_name}
            </span>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Powered by{" "}
            <span className="font-semibold text-indigo-600">SignWell</span>
          </p>
        </div>
      </main>
    </div>
  );
}
