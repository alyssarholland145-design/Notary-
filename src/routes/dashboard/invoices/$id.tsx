import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";
import { useState } from "react";

interface InvoiceDetail {
  id: string;
  signing_id: string | null;
  amount_cents: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  signing_title: string | null;
  signing_client_name: string | null;
}

const getInvoice = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { id: string } }): Promise<InvoiceDetail | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const rows = await sql()`
      SELECT i.id, i.signing_id, i.amount_cents, i.status, i.due_date,
             i.paid_at, i.created_at, s.title AS signing_title, s.client_name AS signing_client_name
      FROM invoices i
      LEFT JOIN signings s ON i.signing_id = s.id
      WHERE i.id = ${data.id} AND i.user_id = ${user.id}
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      signing_id: r.signing_id ? String(r.signing_id) : null,
      amount_cents: Number(r.amount_cents),
      status: String(r.status),
      due_date: r.due_date ? String(r.due_date) : null,
      paid_at: r.paid_at ? String(r.paid_at) : null,
      created_at: String(r.created_at),
      signing_title: r.signing_title ? String(r.signing_title) : null,
      signing_client_name: r.signing_client_name ? String(r.signing_client_name) : null,
    };
  },
);

const updateInvoice = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: {
    id: string;
    amount_dollars: string;
    due_date: string;
  } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const amountCents = Math.round(parseFloat(data.amount_dollars) * 100);

    await sql()`
      UPDATE invoices
      SET amount_cents = ${amountCents},
          due_date = ${data.due_date ? new Date(data.due_date + "T00:00:00").toISOString().split("T")[0] : null}
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

const markPaid = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");
    await sql()`
      UPDATE invoices
      SET status = 'paid', paid_at = NOW()
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

const markOverdue = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");
    await sql()`
      UPDATE invoices
      SET status = 'overdue'
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

const deleteInvoice = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");
    await sql()`
      DELETE FROM invoices
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  // date may be ISO with time or just YYYY-MM-DD
  return dateStr.split("T")[0];
}

export const Route = createFileRoute("/dashboard/invoices/$id")({
  loader: async ({ params }) => {
    const invoice = await getInvoice({ data: { id: params.id } });
    return { invoice, id: params.id };
  },
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoice: initialInvoice, id } = Route.useLoaderData();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit form state
  const [editAmountDollars, setEditAmountDollars] = useState(
    invoice ? (invoice.amount_cents / 100).toFixed(2) : ""
  );
  const [editDueDate, setEditDueDate] = useState(
    invoice ? toDateInput(invoice.due_date) : ""
  );
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!invoice) {
    return (
      <div>
        <Link
          to="/dashboard/invoices"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <span aria-hidden="true">←</span> Back to invoices
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">Invoice not found.</p>
        </div>
      </div>
    );
  }

  const handleAction = async (
    action: (data: { data: { id: string } }) => Promise<unknown>,
    label: string,
  ) => {
    setActionError("");
    setActionLoading(label);
    try {
      await action({ data: { id } });
      const updated = await getInvoice({ data: { id } });
      if (updated) {
        setInvoice(updated);
      }
      if (label === "delete") {
        navigate({ to: "/dashboard/invoices" });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    const amount = parseFloat(editAmountDollars);
    if (!editAmountDollars.trim() || isNaN(amount) || amount <= 0) {
      setEditError("Amount is required and must be greater than $0.00.");
      return;
    }

    setSaving(true);
    try {
      await updateInvoice({
        data: {
          id,
          amount_dollars: editAmountDollars.trim(),
          due_date: editDueDate,
        },
      });
      const updated = await getInvoice({ data: { id } });
      if (updated) {
        setInvoice(updated);
        setEditAmountDollars((updated.amount_cents / 100).toFixed(2));
        setEditDueDate(toDateInput(updated.due_date));
      }
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update invoice.");
    } finally {
      setSaving(false);
    }
  };

  const clientLabel = invoice.signing_title
    ? invoice.signing_title + (invoice.signing_client_name ? ` — ${invoice.signing_client_name}` : "")
    : invoice.signing_client_name ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/dashboard/invoices"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        <span aria-hidden="true">←</span> Back to invoices
      </Link>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {editing ? (
        /* Edit mode */
        <>
          <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
          <p className="mt-1 text-gray-600">Update invoice details.</p>

          <form onSubmit={handleSaveEdit} className="mt-8 space-y-5">
            {editError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {editError}
              </div>
            )}

            {/* Amount */}
            <div>
              <label htmlFor="editAmount" className="block text-sm font-medium text-gray-700">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">$</span>
                <input
                  id="editAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editAmountDollars}
                  onChange={(e) => setEditAmountDollars(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="editDueDate" className="block text-sm font-medium text-gray-700">
                Due date
              </label>
              <input
                id="editDueDate"
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Submit */}
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
                onClick={() => {
                  setEditAmountDollars((invoice.amount_cents / 100).toFixed(2));
                  setEditDueDate(toDateInput(invoice.due_date));
                  setEditing(false);
                  setEditError("");
                }}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      ) : (
        /* View mode */
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
              {clientLabel && (
                <p className="mt-1 text-gray-600">{clientLabel}</p>
              )}
            </div>
            {statusBadge(invoice.status)}
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Amount</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatDollars(invoice.amount_cents)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Status</dt>
                <dd className="mt-1">{statusBadge(invoice.status)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.due_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.created_at)}</dd>
              </div>
              {invoice.paid_at && (
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Paid</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(invoice.paid_at)}</dd>
                </div>
              )}
              {invoice.signing_title && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-gray-400">Linked Signing</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link
                      to="/dashboard/schedule/$id"
                      params={{ id: invoice.signing_id! }}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      {invoice.signing_title}
                      {invoice.signing_client_name ? ` — ${invoice.signing_client_name}` : ""}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditAmountDollars((invoice.amount_cents / 100).toFixed(2));
                setEditDueDate(toDateInput(invoice.due_date));
                setEditing(true);
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Edit
            </button>
            {invoice.status !== "paid" && (
              <button
                type="button"
                disabled={actionLoading === "paid"}
                onClick={() => handleAction(markPaid, "paid")}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === "paid" ? "Marking..." : "Mark as Paid"}
              </button>
            )}
            {invoice.status !== "overdue" && invoice.status !== "paid" && (
              <button
                type="button"
                disabled={actionLoading === "overdue"}
                onClick={() => handleAction(markOverdue, "overdue")}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading === "overdue" ? "Marking..." : "Mark as Overdue"}
              </button>
            )}
            <button
              type="button"
              disabled={actionLoading === "delete"}
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this invoice? This cannot be undone.")) {
                  handleAction(deleteInvoice, "delete");
                }
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === "delete" ? "Deleting..." : "Delete"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
