import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";

export interface DocumentRow {
  id: string;
  signing_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  data: string;
  uploaded_at: string;
}

export const uploadDocument = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: {
      signingId: string;
      filename: string;
      mimeType: string;
      base64Data: string;
    };
  }): Promise<DocumentRow> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // Verify the signing belongs to this user
    const signings = await sql()`
      SELECT id FROM signings WHERE id = ${data.signingId} AND user_id = ${user.id}
    `;
    if (signings.length === 0) throw new Error("Signing not found");

    // Calculate byte size from base64 (rough)
    const sizeBytes = Math.ceil((data.base64Data.length * 3) / 4);

    const rows = await sql()`
      INSERT INTO documents (signing_id, filename, mime_type, size_bytes, data)
      VALUES (${data.signingId}, ${data.filename}, ${data.mimeType}, ${sizeBytes}, ${data.base64Data})
      RETURNING id, signing_id, filename, mime_type, size_bytes, data, uploaded_at
    `;

    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      signing_id: String(r.signing_id),
      filename: String(r.filename),
      mime_type: String(r.mime_type),
      size_bytes: Number(r.size_bytes),
      data: String(r.data),
      uploaded_at: String(r.uploaded_at),
    };
  },
);

export const getDocuments = createServerFn({ method: "GET" }).handler(
  async ({
    data,
  }: {
    data: { signingId: string };
  }): Promise<DocumentRow[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    // Verify the signing belongs to this user
    const signings = await sql()`
      SELECT id FROM signings WHERE id = ${data.signingId} AND user_id = ${user.id}
    `;
    if (signings.length === 0) return [];

    const rows = await sql()`
      SELECT id, signing_id, filename, mime_type, size_bytes, data, uploaded_at
      FROM documents
      WHERE signing_id = ${data.signingId}
      ORDER BY uploaded_at DESC
    `;

    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      signing_id: String(r.signing_id),
      filename: String(r.filename),
      mime_type: String(r.mime_type),
      size_bytes: Number(r.size_bytes),
      data: String(r.data),
      uploaded_at: String(r.uploaded_at),
    }));
  },
);

export const deleteDocument = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: { docId: string };
  }): Promise<void> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // Verify the document belongs to a signing owned by this user
    const docs = await sql()`
      SELECT d.id
      FROM documents d
      JOIN signings s ON d.signing_id = s.id
      WHERE d.id = ${data.docId} AND s.user_id = ${user.id}
    `;
    if (docs.length === 0) throw new Error("Document not found");

    await sql()`DELETE FROM documents WHERE id = ${data.docId}`;
  },
);
