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

const createInvoice = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: {
    amount_dollars: string;
    due_date: string;
    signing_id: string;
  } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const amountCents = Math.round(parseFloat(data.amount_dollars) * 100);

    const result = await sql()`
      INSERT INTO invoices (user_id, signing_id, amount_cents, status, due_date)
      VALUES (
        ${user.id},
        ${data.signing_id || null},
        ${amountCents},
        'pending',
        ${data.due_date ? new Date(data.due_date + "T00:00:00").toISOString().split("T")[0] : null}
      )
      RETURNING id
    `;
    return { id: String(result[0].id) };
  },
);

export const Route = createFileRoute("/dashboard/invoices/new")({
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const navigate = useNavigate();
  const [amountDollars, setAmountDollars] = useState("");
  const [dueDate, setDueDate] = useState("");
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

    const amount = parseFloat(amountDollars);
    if (!amountDollars.trim() || isNaN(amount) || amount <= 0) {
      setError("Amount is required and must be greater than $0.00.");
      return;
    }

    setSubmitting(true);
    try {
      await createInvoice({
        data: {
          amount_dollars: amountDollars.trim(),
          due_date: dueDate,
          signing_id: signingId,
        },
      });
      navigate({ to: "/dashboard/invoices" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/dashboard/invoices"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        <span aria-hidden="true">←</span> Back to invoices
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
      <p className="mt-1 text-gray-600">Create a new invoice for a signing appointment.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount ($) <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">$</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              placeholder="0.00"
              className="mt-1 block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <p className="mt-1 text-xs text-gray-400">
            Link this invoice to a specific signing appointment for easy reference.
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Invoice"}
          </button>
          <Link
            to="/dashboard/invoices"
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
