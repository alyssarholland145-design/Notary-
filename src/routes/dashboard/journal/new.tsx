import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";
import { useState, useEffect } from "react";

interface SigningOption {
  id: string;
  title: string;
  client_name: string | null;
}

const getRecentSignings = createServerFn({ method: "GET" }).handler(async (): Promise<SigningOption[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await sql()`
    SELECT id, title, client_name
    FROM signings
    WHERE user_id = ${user.id}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    title: String(r.title),
    client_name: r.client_name ? String(r.client_name) : null,
  }));
});

const createJournalEntry = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: {
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

    const result = await sql()`
      INSERT INTO journal_entries (
        user_id, signing_id, signer_name, document_type, id_presented,
        fee_charged, date_of_notarization, notary_state, additional_notes
      ) VALUES (
        ${user.id},
        ${data.signing_id || null},
        ${data.signer_name},
        ${data.document_type || null},
        ${data.id_presented || null},
        ${feeCents},
        ${data.date_of_notarization},
        ${data.notary_state || null},
        ${data.additional_notes || null}
      )
      RETURNING id
    `;
    return { id: String(result[0].id) };
  },
);

export const Route = createFileRoute("/dashboard/journal/new")({
  component: NewJournalEntryPage,
});

function NewJournalEntryPage() {
  const navigate = useNavigate();
  const [signerName, setSignerName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [idPresented, setIdPresented] = useState("");
  const [feeDollars, setFeeDollars] = useState("");
  const [dateOfNotarization, setDateOfNotarization] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notaryState, setNotaryState] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [signingId, setSigningId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signings, setSignings] = useState<SigningOption[]>([]);

  useEffect(() => {
    getRecentSignings().then(setSignings).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!signerName.trim()) {
      setError("Signer name is required.");
      return;
    }
    if (!dateOfNotarization) {
      setError("Date of notarization is required.");
      return;
    }

    setSubmitting(true);
    try {
      await createJournalEntry({
        data: {
          signer_name: signerName.trim(),
          document_type: documentType.trim(),
          id_presented: idPresented.trim(),
          fee_charged_dollars: feeDollars.trim(),
          date_of_notarization: dateOfNotarization,
          notary_state: notaryState.trim().toUpperCase(),
          additional_notes: additionalNotes.trim(),
          signing_id: signingId,
        },
      });
      navigate({ to: "/dashboard/journal" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create journal entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/dashboard/journal"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        <span aria-hidden="true">←</span> Back to journal
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">New Journal Entry</h1>
      <p className="mt-1 text-gray-600">Record a new notarization in your journal.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Signer Name */}
        <div>
          <label htmlFor="signerName" className="block text-sm font-medium text-gray-700">
            Signer name <span className="text-red-500">*</span>
          </label>
          <input
            id="signerName"
            type="text"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="e.g. John Smith"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Date of Notarization */}
        <div>
          <label htmlFor="dateOfNotarization" className="block text-sm font-medium text-gray-700">
            Date of notarization <span className="text-red-500">*</span>
          </label>
          <input
            id="dateOfNotarization"
            type="date"
            required
            value={dateOfNotarization}
            onChange={(e) => setDateOfNotarization(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Document Type */}
        <div>
          <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
            Document type
          </label>
          <input
            id="documentType"
            type="text"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            placeholder="e.g. Power of Attorney, Deed of Trust"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* ID Presented */}
        <div>
          <label htmlFor="idPresented" className="block text-sm font-medium text-gray-700">
            ID presented
          </label>
          <input
            id="idPresented"
            type="text"
            value={idPresented}
            onChange={(e) => setIdPresented(e.target.value)}
            placeholder="e.g. Driver's License — TX-12345678"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Fee Charged */}
        <div>
          <label htmlFor="feeDollars" className="block text-sm font-medium text-gray-700">
            Fee charged ($)
          </label>
          <input
            id="feeDollars"
            type="number"
            step="0.01"
            min="0"
            value={feeDollars}
            onChange={(e) => setFeeDollars(e.target.value)}
            placeholder="0.00"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Notary State */}
        <div>
          <label htmlFor="notaryState" className="block text-sm font-medium text-gray-700">
            Notary state
          </label>
          <input
            id="notaryState"
            type="text"
            maxLength={2}
            value={notaryState}
            onChange={(e) => setNotaryState(e.target.value.toUpperCase())}
            placeholder="e.g. TX"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Linked Signing */}
        <div>
          <label htmlFor="signingId" className="block text-sm font-medium text-gray-700">
            Linked signing (optional)
          </label>
          <select
            id="signingId"
            value={signingId}
            onChange={(e) => setSigningId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— None —</option>
            {signings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}{s.client_name ? ` — ${s.client_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700">
            Additional notes
          </label>
          <textarea
            id="additionalNotes"
            rows={3}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any additional details about this notarization..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Entry"}
          </button>
          <Link
            to="/dashboard/journal"
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
