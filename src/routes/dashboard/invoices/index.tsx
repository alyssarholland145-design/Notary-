import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";
import { useState, useEffect } from "react";

interface Invoice {
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

const getInvoices = createServerFn({ method: "GET" }).handler(async (): Promise<Invoice[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await sql()`
    SELECT i.id, i.signing_id, i.amount_cents, i.status, i.due_date,
           i.paid_at, i.created_at, s.title AS signing_title, s.client_name AS signing_client_name
    FROM invoices i
    LEFT JOIN signings s ON i.signing_id = s.id
    WHERE i.user_id = ${user.id}
    ORDER BY i.created_at DESC
  `;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    signing_id: r.signing_id ? String(r.signing_id) : null,
    amount_cents: Number(r.amount_cents),
    status: String(r.status),
    due_date: r.due_date ? String(r.due_date) : null,
    paid_at: r.paid_at ? String(r.paid_at) : null,
    created_at: String(r.created_at),
    signing_title: r.signing_title ? String(r.signing_title) : null,
    signing_client_name: r.signing_client_name ? String(r.signing_client_name) : null,
  }));
});

export const Route = createFileRoute("/dashboard/invoices/")({
  loader: () => getInvoices(),
  component: InvoiceListPage,
});

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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function clientLabel(invoice: Invoice): string {
  if (invoice.signing_title) {
    return invoice.signing_title + (invoice.signing_client_name ? ` — ${invoice.signing_client_name}` : "");
  }
  if (invoice.signing_client_name) return invoice.signing_client_name;
  return "Invoice";
}

function InvoiceListPage() {
  const invoices = Route.useLoaderData();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-gray-600">Track and manage your invoices.</p>
        </div>
        <Link
          to="/dashboard/invoices/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <span aria-hidden="true">+</span> New Invoice
        </Link>
      </div>

      {!loaded ? (
        <div className="mt-8 text-center text-gray-400">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-lg font-medium text-gray-500">
            No invoices yet. Create your first invoice!
          </p>
          <Link
            to="/dashboard/invoices/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New Invoice
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          {/* Table header */}
          <div className="hidden rounded-t-xl border border-gray-200 bg-gray-50 px-5 py-3 sm:grid sm:grid-cols-5 sm:gap-4">
            <span className="text-xs font-semibold uppercase text-gray-500">Client / Title</span>
            <span className="text-xs font-semibold uppercase text-gray-500">Amount</span>
            <span className="text-xs font-semibold uppercase text-gray-500">Status</span>
            <span className="text-xs font-semibold uppercase text-gray-500">Due Date</span>
            <span className="text-xs font-semibold uppercase text-gray-500">Created</span>
          </div>

          {/* Table body */}
          <div className="rounded-b-xl border border-t-0 border-gray-200 bg-white">
            {invoices.map((inv, i) => (
              <Link
                key={inv.id}
                to="/dashboard/invoices/$id"
                params={{ id: inv.id }}
                className={`block px-5 py-3.5 transition-colors hover:bg-indigo-50 ${
                  i !== invoices.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-5 sm:gap-4 sm:items-center">
                  <span className="font-medium text-gray-900 truncate">
                    {clientLabel(inv)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDollars(inv.amount_cents)}
                  </span>
                  <span>{statusBadge(inv.status)}</span>
                  <span className="text-sm text-gray-600">
                    {formatDate(inv.due_date)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(inv.created_at)}
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
