import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { sql } from "~/db";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const createSession = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { userId: string } }) => {
    const { setCookie } = await import("@tanstack/react-start/server");
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    await sql()`INSERT INTO sessions (user_id, token, expires_at) VALUES (${data.userId}, ${token}, ${expiresAt.toISOString()})`;
    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return token;
  },
);

export const deleteCurrentSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
    const token = getCookie(SESSION_COOKIE);
    if (token) {
      deleteCookie(SESSION_COOKIE, { path: "/" });
      try {
        await sql()`DELETE FROM sessions WHERE token = ${token}`;
      } catch {
        // Session may already be expired/deleted — ignore
      }
    }
  },
);

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; email: string; full_name: string } | null> => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const token = getCookie(SESSION_COOKIE);
    if (!token) return null;

    try {
      const rows = await sql()`
        SELECT u.id, u.email, u.full_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ${token} AND s.expires_at > NOW()
      `;
      if (rows.length === 0) return null;
      const user = rows[0];
      return {
        id: String(user.id),
        email: String(user.email),
        full_name: String(user.full_name),
      };
    } catch {
      return null;
    }
  },
);
