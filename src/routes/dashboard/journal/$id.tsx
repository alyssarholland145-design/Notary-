import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";
import { useState } from "react";

interface JournalEntryDetail {
  id: string;
  user_id: string;
  signing_id: string | null;
  signer_name: string;
  document_type: string | null;
  id_presented: string | null;
  fee_charged: number | null;
  date_of_notarization: string;
  notary_state: string | null;
  additional_notes: string | null;
  created_at: string;
}

const getJournalEntry = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { id: string } }): Promise<JournalEntryDetail | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const rows = await sql()`
      SELECT id, user_id, signing_id, signer_name, document_type, id_presented,
             fee_charged, date_of_notarization, notary_state, additional_notes, created_at
      FROM journal_entries
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      signing_id: r.signing_id ? String(r.signing_id) : null,
      signer_name: String(r.signer_name),
      document_type: r.document_type ? String(r.document_type) : null,
      id_presented: r.id_presented ? String(r.id_presented) : null,
      fee_charged: r.fee_charged != null ? Number(r.fee_charged) : null,
      date_of_notarization: String(r.date_of_notarization),
      notary_state: r.notary_state ? String(r.notary_state) : null,
      additional_notes: r.additional_notes ? String(r.additional_notes) : null,
      created_at: String(r.created_at),
    };
  },
);

const updateJournalEntry = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: {
    id: string;
    signer_name: string;
    document_type: string;
    id_presented: string;
    fee_charged_dollars: string;
    date_of_notarization: string;
    notary_state: string;
    additional_notes: string;
    signing_id: string;
  } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const feeCents = data.fee_charged_dollars
      ? Math.round(parseFloat(data.fee_charged_dollars) * 100)
      : null;

    await sql()`
      UPDATE journal_entries
      SET signer_name = ${data.signer_name},
          document_type = ${data.document_type || null},
          id_presented = ${data.id_presented || null},
          fee_charged = ${feeCents},
          date_of_notarization = ${data.date_of_notarization},
          notary_state = ${data.notary_state || null},
          additional_notes = ${data.additional_notes || null},
          signing_id = ${data.signing_id || null}
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

const deleteJournalEntry = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await sql()`
      DELETE FROM journal_entries
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatFee(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function centsToDollars(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export const Route = createFileRoute("/dashboard/journal/$id")({
  loader: async ({ params }) => {
    const entry = await getJournalEntry({ data: { id: params.id } });
    return { entry, id: params.id };
  },
  component: JournalEntryDetailPage,
});

function JournalEntryDetailPage() {
  const { entry: initialEntry, id } = Route.useLoaderData();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(initialEntry);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit form state
  const [editSignerName, setEditSignerName] = useState(entry?.signer_name ?? "");
  const [editDocumentType, setEditDocumentType] = useState(entry?.document_type ?? "");
  const [editIdPresented, setEditIdPresented] = useState(entry?.id_presented ?? "");
  const [editFeeDollars, setEditFeeDollars] = useState(centsToDollars(entry?.fee_charged ?? null));
  const [editDateOfNotarization, setEditDateOfNotarization] = useState(entry?.date_of_notarization ?? "");
  const [editNotaryState, setEditNotaryState] = useState(entry?.notary_state ?? "");
  const [editAdditionalNotes, setEditAdditionalNotes] = useState(entry?.additional_notes ?? "");
  const [editSigningId, setEditSigningId] = useState(entry?.signing_id ?? "");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!entry) {
    return (
      <div>
        <Link
          to="/dashboard/journal"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <span aria-hidden="true">←</span> Back to journal
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">Journal entry not found.</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this journal entry? This cannot be undone.")) {
      return;
    }
    setActionError("");
    setActionLoading("delete");
    try {
      await deleteJournalEntry({ data: { id } });
      navigate({ to: "/dashboard/journal" });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete entry.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    if (!editSignerName.trim()) {
      setEditError("Signer name is required.");
      return;
    }
    if (!editDateOfNotarization) {
      setEditError("Date of notarization is required.");
      return;
    }

    setSaving(true);
    try {
      await updateJournalEntry({
        data: {
          id,
          signer_name: editSignerName.trim(),
          document_type: editDocumentType.trim(),
          id_presented: editIdPresented.trim(),
          fee_charged_dollars: editFeeDollars.trim(),
          date_of_notarization: editDateOfNotarization,
          notary_state: editNotaryState.trim().toUpperCase(),
          additional_notes: editAdditionalNotes.trim(),
          signing_id: editSigningId,
        },
      });
      // Refresh data
      const updated = await getJournalEntry({ data: { id } });
      if (updated) {
        setEntry(updated);
        setEditSignerName(updated.signer_name);
        setEditDocumentType(updated.document_type ?? "");
        setEditIdPresented(updated.id_presented ?? "");
        setEditFeeDollars(centsToDollars(updated.fee_charged));
        setEditDateOfNotarization(updated.date_of_notarization);
        setEditNotaryState(updated.notary_state ?? "");
        setEditAdditionalNotes(updated.additional_notes ?? "");
        setEditSigningId(updated.signing_id ?? "");
      }
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update entry.");
    } finally {
      setSaving(false);
    }
  };

  // Edit mode
  if (editing) {
    return (
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <span aria-hidden="true">←</span> Cancel editing
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Edit Journal Entry</h1>

        <form onSubmit={handleEditSubmit} className="mt-8 space-y-5">
          {editError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {editError}
            </div>
          )}

          <div>
            <label htmlFor="editSignerName" className="block text-sm font-medium text-gray-700">
              Signer name <span className="text-red-500">*</span>
            </label>
            <input
              id="editSignerName"
              type="text"
              required
              value={editSignerName}
              onChange={(e) => setEditSignerName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editDateOfNotarization" className="block text-sm font-medium text-gray-700">
              Date of notarization <span className="text-red-500">*</span>
            </label>
            <input
              id="editDateOfNotarization"
              type="date"
              required
              value={editDateOfNotarization}
              onChange={(e) => setEditDateOfNotarization(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editDocumentType" className="block text-sm font-medium text-gray-700">
              Document type
            </label>
            <input
              id="editDocumentType"
              type="text"
              value={editDocumentType}
              onChange={(e) => setEditDocumentType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editIdPresented" className="block text-sm font-medium text-gray-700">
              ID presented
            </label>
            <input
              id="editIdPresented"
              type="text"
              value={editIdPresented}
              onChange={(e) => setEditIdPresented(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editFeeDollars" className="block text-sm font-medium text-gray-700">
              Fee charged ($)
            </label>
            <input
              id="editFeeDollars"
              type="number"
              step="0.01"
              min="0"
              value={editFeeDollars}
              onChange={(e) => setEditFeeDollars(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editNotaryState" className="block text-sm font-medium text-gray-700">
              Notary state
            </label>
            <input
              id="editNotaryState"
              type="text"
              maxLength={2}
              value={editNotaryState}
              onChange={(e) => setEditNotaryState(e.target.value.toUpperCase())}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editSigningId" className="block text-sm font-medium text-gray-700">
              Linked signing
            </label>
            <input
              id="editSigningId"
              type="text"
              value={editSigningId}
              onChange={(e) => setEditSigningId(e.target.value)}
              placeholder="Signing ID"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editAdditionalNotes" className="block text-sm font-medium text-gray-700">
              Additional notes
            </label>
            <textarea
              id="editAdditionalNotes"
              rows={3}
              value={editAdditionalNotes}
              onChange={(e) => setEditAdditionalNotes(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // View mode
  return (
    <div>
      <Link
        to="/dashboard/journal"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        <span aria-hidden="true">←</span> Back to journal
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Journal Entry
        </h1>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-gray-400">Signer name</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{entry.signer_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-400">Date of notarization</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(entry.date_of_notarization)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-400">Document type</dt>
            <dd className="mt-1 text-sm text-gray-900">{entry.document_type || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-400">ID presented</dt>
            <dd className="mt-1 text-sm text-gray-900">{entry.id_presented || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-400">Fee charged</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatFee(entry.fee_charged)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-400">Notary state</dt>
            <dd className="mt-1 text-sm text-gray-900">{entry.notary_state || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-400">Linked signing</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {entry.signing_id ? (
                <Link to="/dashboard/schedule/$id" params={{ id: entry.signing_id }} className="text-indigo-600 hover:text-indigo-500">
                  View signing
                </Link>
              ) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-400">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(entry.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </dd>
          </div>
        </dl>
        {entry.additional_notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <dt className="text-xs font-medium uppercase text-gray-400">Additional notes</dt>
            <dd className="mt-1 text-sm whitespace-pre-wrap text-gray-700">{entry.additional_notes}</dd>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setEditSignerName(entry.signer_name);
            setEditDocumentType(entry.document_type ?? "");
            setEditIdPresented(entry.id_presented ?? "");
            setEditFeeDollars(centsToDollars(entry.fee_charged));
            setEditDateOfNotarization(entry.date_of_notarization);
            setEditNotaryState(entry.notary_state ?? "");
            setEditAdditionalNotes(entry.additional_notes ?? "");
            setEditSigningId(entry.signing_id ?? "");
            setEditing(true);
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={actionLoading === "delete"}
          onClick={handleDelete}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
        >
          {actionLoading === "delete" ? "Deleting..." : "Delete"}
        </button>
      </div>

      {actionError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}
    </div>
  );
}
