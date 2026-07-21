import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "~/lib/auth";
import { sql } from "~/db";

export interface SharedSigning {
  id: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  location: string | null;
  scheduled_at: string | null;
  status: string;
  notary_name: string;
}

/**
 * Toggle sharing for a signing. If enabling, generates a share_token if one
 * doesn't already exist. Returns the share_token (or null if disabled).
 */
export const toggleSharing = createServerFn({ method: "POST" }).handler(
  async ({
    data,
  }: {
    data: { signingId: string };
  }): Promise<{ share_token: string | null; sharing_enabled: boolean }> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // Verify the signing belongs to this user and get current state
    const rows = await sql()`
      SELECT sharing_enabled, share_token
      FROM signings
      WHERE id = ${data.signingId} AND user_id = ${user.id}
    `;
    if (rows.length === 0) throw new Error("Signing not found");

    const current = rows[0] as Record<string, unknown>;
    const currentlyEnabled = Boolean(current.sharing_enabled);
    const newEnabled = !currentlyEnabled;

    if (newEnabled) {
      // Enable sharing: generate a token if one doesn't exist
      let token = current.share_token ? String(current.share_token) : null;
      if (!token) {
        token = crypto.randomUUID();
      }
      await sql()`
        UPDATE signings
        SET sharing_enabled = true, share_token = ${token}
        WHERE id = ${data.signingId}
      `;
      return { share_token: token, sharing_enabled: true };
    } else {
      // Disable sharing
      await sql()`
        UPDATE signings
        SET sharing_enabled = false
        WHERE id = ${data.signingId}
      `;
      return { share_token: null, sharing_enabled: false };
    }
  },
);

/**
 * Get the current sharing status for a signing (for the detail page).
 */
export const getSharingStatus = createServerFn({ method: "GET" }).handler(
  async ({
    data,
  }: {
    data: { signingId: string };
  }): Promise<{ share_token: string | null; sharing_enabled: boolean }> => {
    const user = await getCurrentUser();
    if (!user) return { share_token: null, sharing_enabled: false };

    const rows = await sql()`
      SELECT sharing_enabled, share_token
      FROM signings
      WHERE id = ${data.signingId} AND user_id = ${user.id}
    `;
    if (rows.length === 0) return { share_token: null, sharing_enabled: false };

    const r = rows[0] as Record<string, unknown>;
    return {
      sharing_enabled: Boolean(r.sharing_enabled),
      share_token: r.share_token ? String(r.share_token) : null,
    };
  },
);

/**
 * Public function — no auth required. Returns signing details if sharing
 * is enabled for the given token. Returns null otherwise.
 */
export const getSigningByToken = createServerFn({ method: "GET" }).handler(
  async ({
    data,
  }: {
    data: { token: string };
  }): Promise<SharedSigning | null> => {
    const rows = await sql()`
      SELECT s.id, s.title, s.client_name, s.client_email, s.location,
             s.scheduled_at, s.status, u.full_name AS notary_name
      FROM signings s
      JOIN users u ON s.user_id = u.id
      WHERE s.share_token = ${data.token}
        AND s.sharing_enabled = true
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
      status: String(r.status),
      notary_name: String(r.notary_name),
    };
  },
);
