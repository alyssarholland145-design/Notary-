import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";
import { useState, useEffect } from "react";

interface JournalEntry {
  id: string;
  signer_name: string;
  document_type: string | null;
  id_presented: string | null;
  fee_charged: number | null;
  date_of_notarization: string;
  notary_state: string | null;
  additional_notes: string | null;
  created_at: string;
}

const getJournalEntries = createServerFn({ method: "GET" }).handler(async (): Promise<JournalEntry[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await sql()`
    SELECT id, signer_name, document_type, id_presented, fee_charged,
           date_of_notarization, notary_state, additional_notes, created_at
    FROM journal_entries
    WHERE user_id = ${user.id}
    ORDER BY date_of_notarization DESC, created_at DESC
  `;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    signer_name: String(r.signer_name),
    document_type: r.document_type ? String(r.document_type) : null,
    id_presented: r.id_presented ? String(r.id_presented) : null,
    fee_charged: r.fee_charged != null ? Number(r.fee_charged) : null,
    date_of_notarization: String(r.date_of_notarization),
    notary_state: r.notary_state ? String(r.notary_state) : null,
    additional_notes: r.additional_notes ? String(r.additional_notes) : null,
    created_at: String(r.created_at),
  }));
});

export const Route = createFileRoute("/dashboard/journal/")({
  loader: () => getJournalEntries(),
  component: JournalListPage,
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFee(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function JournalListPage() {
  const entries = Route.useLoaderData();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notary Journal</h1>
          <p className="mt-1 text-gray-600">Your digital notary journal — track every notarization.</p>
        </div>
        <Link
          to="/dashboard/journal/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <span aria-hidden="true">+</span> New Entry
        </Link>
      </div>

      {!loaded ? (
        <div className="mt-8 text-center text-gray-400">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-lg font-medium text-gray-500">
            No journal entries yet. Record your first notarization!
          </p>
          <Link
            to="/dashboard/journal/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New Entry
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          {/* Table header */}
          <div className="hidden rounded-t-xl border border-gray-200 bg-gray-50 px-5 py-3 sm:grid sm:grid-cols-5 sm:gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">Signer</span>
            <span className="text-xs font-semibold uppercase text-gray-500">Document</span>
            <span className="text-xs font-semibold uppercase text-gray-500">Date</span>
            <span className="text-xs font-semibold uppercase text-gray-500">Fee</span>
            <span className="text-xs font-semibold uppercase text-gray-500">State</span>
          </div>

          {/* Table body */}
          <div className="rounded-b-xl border border-t-0 border-gray-200 bg-white">
            {entries.map((entry, i) => (
              <Link
                key={entry.id}
                to="/dashboard/journal/$id"
                params={{ id: entry.id }}
                className={`block px-5 py-3.5 transition-colors hover:bg-indigo-50 ${
                  i !== entries.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-5 sm:gap-4 sm:items-center">
                  <span className="font-medium text-gray-900 truncate">
                    {entry.signer_name}
                  </span>
                  <span className="text-sm text-gray-600 truncate">
                    {entry.document_type || "—"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatDate(entry.date_of_notarization)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatFee(entry.fee_charged)}
                  </span>
                  <span className="text-sm text-gray-600">
                    {entry.notary_state || "—"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
