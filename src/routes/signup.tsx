import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { hashPassword, createSession } from "~/lib/auth";
import { sql } from "~/db";

const signupAction = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { email: string; password: string; fullName: string } }) => {
    const { email, password, fullName } = data;

    // Validate
    const errors: Record<string, string> = {};
    if (!email?.trim()) errors.email = "Email is required";
    if (!password?.trim()) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";
    if (!fullName?.trim()) errors.fullName = "Full name is required";

    if (Object.keys(errors).length > 0) {
      return { success: false, errors } as const;
    }

    // Check for existing user
    const existing = await sql()`SELECT id FROM users WHERE email = ${email.trim().toLowerCase()}`;
    if (existing.length > 0) {
      return { success: false, errors: { email: "An account with this email already exists" } } as const;
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const result = await sql()`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${email.trim().toLowerCase()}, ${passwordHash}, ${fullName.trim()})
      RETURNING id
    `;
    const userId = result[0].id as string;

    // Create session
    await createSession({ data: { userId } });

    throw redirect({ to: "/dashboard" });
  });

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    try {
      const result = await signupAction({ data: { email, password, fullName } });
      if (result && !result.success) {
        setErrors(result.errors);
      }
    } catch (err) {
      // Redirect throws, so if we reach here it's a real error
      if (err instanceof Error && err.message !== "redirect") {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Start managing your notary business with SignWell.
        </p>

        {serverError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

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
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <p className="text-center text-sm text-gray-500">Or start with a paid plan:</p>
          <div className="mt-3 flex gap-3">
            <a
              href="https://buy.stripe.com/14AcN5e095yo30p6e4fbq02"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Starter — $29/mo
            </a>
            <a
              href="https://buy.stripe.com/aFa7sL3lve4UasR45Wfbq03"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Pro — $59/mo
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
