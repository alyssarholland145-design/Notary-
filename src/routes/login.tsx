import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { verifyPassword, createSession } from "~/lib/auth";
import { sql } from "~/db";

const loginAction = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { email: string; password: string } }) => {
    const { email, password } = data;

    if (!email?.trim() || !password?.trim()) {
      return { success: false, error: "Invalid email or password" } as const;
    }

    // Find user
    const rows = await sql()`SELECT id, password_hash FROM users WHERE email = ${email.trim().toLowerCase()}`;
    if (rows.length === 0) {
      return { success: false, error: "Invalid email or password" } as const;
    }

    const user = rows[0];
    const valid = await verifyPassword(password, String(user.password_hash));
    if (!valid) {
      return { success: false, error: "Invalid email or password" } as const;
    }

    // Create session
    await createSession({ data: { userId: String(user.id) } });

    throw redirect({ to: "/dashboard" });
  });

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await loginAction({ data: { email, password } });
      if (result && !result.success) {
        setError(result.error);
      }
    } catch (err) {
      if (err instanceof Error && err.message !== "redirect") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to SignWell</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Sign in to manage your notary business.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
