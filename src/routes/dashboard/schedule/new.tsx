import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";
import { useState } from "react";

const createSigning = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: {
    title: string;
    client_name: string;
    client_email: string;
    location: string;
    scheduled_at: string;
    notes: string;
  } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const result = await sql()`
      INSERT INTO signings (user_id, title, client_name, client_email, location, scheduled_at, status, notes)
      VALUES (${user.id}, ${data.title}, ${data.client_name || null}, ${data.client_email || null}, ${data.location || null}, ${data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null}, 'scheduled', ${data.notes || null})
      RETURNING id
    `;
    return { id: String(result[0].id) };
  },
);

export const Route = createFileRoute("/dashboard/schedule/new")({
  component: NewSigningPage,
});

function NewSigningPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (scheduledAt && new Date(scheduledAt) <= new Date()) {
      setError("Scheduled date must be in the future.");
      return;
    }

    setSubmitting(true);
    try {
      await createSigning({
        data: {
          title: title.trim(),
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          location: location.trim(),
          scheduled_at: scheduledAt,
          notes: notes.trim(),
        },
      });
      navigate({ to: "/dashboard/schedule" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create signing.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/dashboard/schedule"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        <span aria-hidden="true">←</span> Back to schedule
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">New Signing</h1>
      <p className="mt-1 text-gray-600">Schedule a new signing appointment.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Home Loan Closing — Smith"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Client Name */}
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
            Client name
          </label>
          <input
            id="clientName"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="John Smith"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Client Email */}
        <div>
          <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">
            Client email
          </label>
          <input
            id="clientEmail"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="john@example.com"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="123 Main St, Suite 100, Austin TX"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Scheduled At */}
        <div>
          <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700">
            Date &amp; time
          </label>
          <input
            id="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-400">Must be a future date and time.</p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
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
            {submitting ? "Creating..." : "Create Signing"}
          </button>
          <Link
            to="/dashboard/schedule"
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
