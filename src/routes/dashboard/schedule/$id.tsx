import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { getDocuments, uploadDocument, deleteDocument } from "~/lib/documents";
import { toggleSharing, getSharingStatus } from "~/lib/sharing";
import type { DocumentRow } from "~/lib/documents";
import { sql } from "~/db";
import { useState, useRef, useEffect } from "react";

interface SigningDetail {
  id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  location: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const getSigning = createServerFn({ method: "GET" }).handler(
  async ({ data }: { data: { id: string } }): Promise<SigningDetail | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const rows = await sql()`
      SELECT id, title, client_name, client_email, location,
             scheduled_at, completed_at, status, notes, created_at
      FROM signings
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      title: String(r.title),
      client_name: r.client_name ? String(r.client_name) : null,
      client_email: r.client_email ? String(r.client_email) : null,
      location: r.location ? String(r.location) : null,
      scheduled_at: r.scheduled_at ? String(r.scheduled_at) : null,
      completed_at: r.completed_at ? String(r.completed_at) : null,
      status: String(r.status),
      notes: r.notes ? String(r.notes) : null,
      created_at: String(r.created_at),
    };
  },
);

const updateSigning = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: {
    id: string;
    title: string;
    client_name: string;
    client_email: string;
    location: string;
    scheduled_at: string;
    notes: string;
  } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await sql()`
      UPDATE signings
      SET title = ${data.title},
          client_name = ${data.client_name || null},
          client_email = ${data.client_email || null},
          location = ${data.location || null},
          scheduled_at = ${data.scheduled_at ? new Date(data.scheduled_at).toISOString() : null},
          notes = ${data.notes || null}
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

const completeSigning = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await sql()`
      UPDATE signings
      SET status = 'completed', completed_at = NOW()
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

const cancelSigning = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await sql()`
      UPDATE signings
      SET status = 'cancelled'
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

const deleteSigning = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { id: string } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await sql()`
      DELETE FROM signings
      WHERE id = ${data.id} AND user_id = ${user.id}
    `;
  },
);

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdfType(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export const Route = createFileRoute("/dashboard/schedule/$id")({
  loader: async ({ params }) => {
    const signing = await getSigning({ data: { id: params.id } });
    return { signing, id: params.id };
  },
  component: SigningDetailPage,
});

function SigningDetailPage() {
  const { signing: initialSigning, id } = Route.useLoaderData();
  const navigate = useNavigate();

  const [signing, setSigning] = useState(initialSigning);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState(signing?.title ?? "");
  const [editClientName, setEditClientName] = useState(signing?.client_name ?? "");
  const [editClientEmail, setEditClientEmail] = useState(signing?.client_email ?? "");
  const [editLocation, setEditLocation] = useState(signing?.location ?? "");
  const [editScheduledAt, setEditScheduledAt] = useState(toDatetimeLocal(signing?.scheduled_at ?? null));
  const [editNotes, setEditNotes] = useState(signing?.notes ?? "");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // Document state
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Sharing state
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Load sharing status
  const loadSharingStatus = async () => {
    try {
      const status = await getSharingStatus({ data: { signingId: id } });
      setSharingEnabled(status.sharing_enabled);
      setShareToken(status.share_token);
    } catch {
      // Silently fail
    }
  };

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
    loadSharingStatus();
  }, [id]);

  const loadDocuments = async () => {
    try {
      const docs = await getDocuments({ data: { signingId: id } });
      setDocuments(docs);
    } catch {
      // Silently fail — user may not have auth
    } finally {
      setDocsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size: max 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("File is too large. Maximum size is 10MB.");
      return;
    }

    setUploadError("");
    setUploading(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data:...;base64, prefix
          const commaIdx = result.indexOf(",");
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
      });

      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      await uploadDocument({
        data: {
          signingId: id,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data,
        },
      });

      // Refresh list
      await loadDocuments();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm("Delete this document?")) return;

    try {
      await deleteDocument({ data: { docId } });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (previewDoc?.id === docId) {
        setPreviewDoc(null);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const handleToggleSharing = async () => {
    setSharingLoading(true);
    try {
      const result = await toggleSharing({ data: { signingId: id } });
      setSharingEnabled(result.sharing_enabled);
      setShareToken(result.share_token);
    } catch {
      // Silently fail
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareToken) {
      const link = `https://site-13hs94uef-lyssa.vercel.app/s/${shareToken}`;
      navigator.clipboard.writeText(link).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }).catch(() => {
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
    }
  };

  const handlePreview = (doc: DocumentRow) => {
    setPreviewDoc(doc);
  };

  if (!signing) {
    return (
      <div>
        <Link
          to="/dashboard/schedule"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <span aria-hidden="true">←</span> Back to schedule
        </Link>
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">Signing not found.</p>
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
      // Refresh data
      const updated = await getSigning({ data: { id } });
      if (updated) {
        setSigning(updated);
      }
      if (label === "delete") {
        navigate({ to: "/dashboard/schedule" });
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

    if (!editTitle.trim()) {
      setEditError("Title is required.");
      return;
    }

    setSaving(true);
    try {
      await updateSigning({
        data: {
          id,
          title: editTitle.trim(),
          client_name: editClientName.trim(),
          client_email: editClientEmail.trim(),
          location: editLocation.trim(),
          scheduled_at: editScheduledAt,
          notes: editNotes.trim(),
        },
      });
      const updated = await getSigning({ data: { id } });
      if (updated) {
        setSigning(updated);
        setEditTitle(updated.title);
        setEditClientName(updated.client_name ?? "");
        setEditClientEmail(updated.client_email ?? "");
        setEditLocation(updated.location ?? "");
        setEditScheduledAt(toDatetimeLocal(updated.scheduled_at));
        setEditNotes(updated.notes ?? "");
      }
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update signing.");
    } finally {
      setSaving(false);
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

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {editing ? (
        /* Edit mode */
        <form onSubmit={handleSaveEdit} className="space-y-5">
          <h1 className="text-2xl font-bold text-gray-900">Edit Signing</h1>

          {editError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {editError}
            </div>
          )}

          <div>
            <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="editTitle"
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editClientName" className="block text-sm font-medium text-gray-700">
              Client name
            </label>
            <input
              id="editClientName"
              type="text"
              value={editClientName}
              onChange={(e) => setEditClientName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editClientEmail" className="block text-sm font-medium text-gray-700">
              Client email
            </label>
            <input
              id="editClientEmail"
              type="email"
              value={editClientEmail}
              onChange={(e) => setEditClientEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editLocation" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="editLocation"
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editScheduledAt" className="block text-sm font-medium text-gray-700">
              Date &amp; time
            </label>
            <input
              id="editScheduledAt"
              type="datetime-local"
              value={editScheduledAt}
              onChange={(e) => setEditScheduledAt(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="editNotes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="editNotes"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
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
      ) : (
        /* View mode */
        <>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{signing.title}</h1>
            {statusBadge(signing.status)}
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Client</dt>
                <dd className="mt-1 text-sm text-gray-900">{signing.client_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{signing.client_email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">{signing.location || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Scheduled</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(signing.scheduled_at)}</dd>
              </div>
              {signing.completed_at && (
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Completed</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(signing.completed_at)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase text-gray-400">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDateTime(signing.created_at)}</dd>
              </div>
            </dl>
            {signing.notes && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <dt className="text-xs font-medium uppercase text-gray-400">Notes</dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap text-gray-700">{signing.notes}</dd>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditTitle(signing.title);
                setEditClientName(signing.client_name ?? "");
                setEditClientEmail(signing.client_email ?? "");
                setEditLocation(signing.location ?? "");
                setEditScheduledAt(toDatetimeLocal(signing.scheduled_at));
                setEditNotes(signing.notes ?? "");
                setEditing(true);
              }}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Edit
            </button>

            {signing.status === "scheduled" && (
              <>
                <button
                  type="button"
                  disabled={actionLoading === "complete"}
                  onClick={() => handleAction(completeSigning, "complete")}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === "complete" ? "Completing..." : "Mark Completed"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading === "cancel"}
                  onClick={() => handleAction(cancelSigning, "cancel")}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                >
                  {actionLoading === "cancel" ? "Cancelling..." : "Cancel Signing"}
                </button>
              </>
            )}

            {(signing.status === "cancelled" || signing.status === "completed") && (
              <button
                type="button"
                disabled={actionLoading === "delete"}
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this signing? This cannot be undone.")) {
                    handleAction(deleteSigning, "delete");
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === "delete" ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>

          {/* ── Documents Section ── */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>

            {/* Upload */}
            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <label className="block text-sm font-medium text-gray-700">
                Upload a document for this signing
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                />
              </div>
              {uploading && (
                <p className="mt-2 text-sm text-indigo-600">Uploading...</p>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                PDF, DOC, DOCX, JPG, or PNG up to 10MB
              </p>
            </div>

            {/* Document list */}
            <div className="mt-4">
              {docsLoading ? (
                <p className="text-sm text-gray-400">Loading documents...</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handlePreview(doc)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline truncate block max-w-xs"
                        >
                          {doc.filename}
                        </button>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(doc.size_bytes)} &middot;{" "}
                          {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="ml-3 shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Preview panel */}
            {previewDoc && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Preview: {previewDoc.filename}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>

                {isImageType(previewDoc.mime_type) ? (
                  <img
                    src={`data:${previewDoc.mime_type};base64,${previewDoc.data}`}
                    alt={previewDoc.filename}
                    className="max-h-96 rounded-lg border border-gray-200 object-contain"
                  />
                ) : isPdfType(previewDoc.mime_type) ? (
                  <div>
                    <iframe
                      src={`data:application/pdf;base64,${previewDoc.data}`}
                      title={previewDoc.filename}
                      className="h-96 w-full rounded-lg border border-gray-200"
                    />
                    <a
                      href={`data:application/pdf;base64,${previewDoc.data}`}
                      download={previewDoc.filename}
                      className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Download PDF
                    </a>
                  </div>
                ) : (
                  <a
                    href={`data:${previewDoc.mime_type};base64,${previewDoc.data}`}
                    download={previewDoc.filename}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download {previewDoc.filename}
                  </a>
                )}
              </div>
            )}
          </div>
          {/* Share with Client */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Share with Client</h2>
            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {sharingEnabled ? "Sharing enabled" : "Sharing disabled"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {sharingEnabled
                      ? "Your client can view signing details via the link below."
                      : "Toggle to generate a shareable link for your client."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSharing}
                  disabled={sharingLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                    sharingEnabled ? "bg-indigo-600" : "bg-gray-200"
                  } ${sharingLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  role="switch"
                  aria-checked={sharingEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      sharingEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {sharingEnabled && shareToken && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Shareable link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://site-13hs94uef-lyssa.vercel.app/s/${shareToken}`}
                      className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                    >
                      {copyFeedback ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
