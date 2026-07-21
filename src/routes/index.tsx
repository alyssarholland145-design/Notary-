import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";

// Read the (optional) business name at request time so the placeholder can be
// personalized by writing site.json — no rebuild needed. Resolves relative to the
// server's working directory (the site root). Falls back to "" if absent/invalid.
const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

export const Route = createFileRoute("/")({
  head: () => ({ title: "SignWell — Your Notary Business, Streamlined" }),
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {businessName ? `${businessName} — ` : ""}Your Notary Business, Streamlined.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            Schedule signings, manage documents, track invoices, and keep a compliant digital journal — all in one place.
          </p>
          <div className="mt-10">
            <a
              href="/signup"
              className="inline-block rounded-lg bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      {/* ---------- How It Works ---------- */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl" aria-hidden="true">1</span>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Schedule</h3>
              <p className="mt-2 text-gray-600">
                Book appointments, set reminders, and keep your calendar organized — all from one dashboard.
              </p>
            </div>
            <div className="text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl" aria-hidden="true">2</span>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Sign</h3>
              <p className="mt-2 text-gray-600">
                Manage documents, guide clients through signings, and log every notarization digitally.
              </p>
            </div>
            <div className="text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl" aria-hidden="true">3</span>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Invoice</h3>
              <p className="mt-2 text-gray-600">
                Generate professional invoices instantly and track payments — get paid faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to run your notary business
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {/* Card 1 */}
            <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
              <span className="text-3xl" aria-hidden="true">📅</span>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Smart Scheduling</h3>
              <p className="mt-2 text-gray-600">
                Manage appointments, set reminders, and avoid double-bookings.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
              <span className="text-3xl" aria-hidden="true">📄</span>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Document Management</h3>
              <p className="mt-2 text-gray-600">
                Upload, preview, and organize signing documents securely.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
              <span className="text-3xl" aria-hidden="true">💰</span>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Simple Invoicing</h3>
              <p className="mt-2 text-gray-600">
                Generate invoices per signing and track payment status.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
              <span className="text-3xl" aria-hidden="true">📓</span>
              <h3 className="mt-4 text-xl font-semibold text-gray-900">Digital Journal</h3>
              <p className="mt-2 text-gray-600">
                Compliant notary journal with all required fields, always at your fingertips.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Who It's For ---------- */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Built for every notary
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            Whether you're an independent mobile notary traveling to clients, a loan signing agent
            handling high-volume real estate closings, or an in-office notary at a bank, law firm,
            UPS store, or government office — SignWell adapts to how you work.
          </p>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Join hundreds of notaries who trust SignWell
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <blockquote className="text-gray-600 italic">
                "SignWell has completely transformed how I manage my loan signings. The digital journal alone saves me hours every week."
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-gray-900">— Maria G., Loan Signing Agent</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <blockquote className="text-gray-600 italic">
                "I used to juggle three different tools. Now everything is in one place — scheduling, docs, and invoicing. Game changer."
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-gray-900">— James T., Mobile Notary</p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <blockquote className="text-gray-600 italic">
                "As a bank notary, compliance is everything. SignWell's digital journal keeps me audit-ready at all times."
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-gray-900">— Lisa R., Bank Notary</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start a free trial. No credit card required.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-2xl gap-8 lg:grid-cols-2">
            {/* Starter */}
            <div className="flex flex-col rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Starter</h3>
              <p className="mt-2 text-sm text-gray-500">For solo notaries getting started.</p>
              <p className="mt-6">
                <span className="text-4xl font-bold tracking-tight text-gray-900">$29</span>
                <span className="text-gray-500">/month</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-600">✓</span>
                  Up to 20 signings/month
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-600">✓</span>
                  Core scheduling
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-600">✓</span>
                  Digital journal
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-indigo-600">✓</span>
                  Basic invoicing
                </li>
              </ul>
              <a
                href="https://buy.stripe.com/14AcN5e095yo30p6e4fbq02"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-600 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 text-center block"
              >
                Start Free Trial
              </a>
            </div>

            {/* Pro (recommended) */}
            <div className="relative flex flex-col rounded-xl bg-indigo-600 p-8 shadow-lg ring-1 ring-indigo-600">
              <span className="absolute -top-3 right-6 rounded-full bg-indigo-800 px-3 py-1 text-xs font-semibold text-white">
                Recommended
              </span>
              <h3 className="text-xl font-semibold text-white">Pro</h3>
              <p className="mt-2 text-sm text-indigo-100">For busy notaries and signing agents.</p>
              <p className="mt-6">
                <span className="text-4xl font-bold tracking-tight text-white">$59</span>
                <span className="text-indigo-100">/month</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-indigo-100">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-white">✓</span>
                  Unlimited signings
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-white">✓</span>
                  Everything in Starter
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-white">✓</span>
                  Automated reminders
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-white">✓</span>
                  Document preview
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-white">✓</span>
                  Client portal
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-white">✓</span>
                  Priority support
                </li>
              </ul>
              <a
                href="https://buy.stripe.com/aFa7sL3lve4UasR45Wfbq03"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white text-center block"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-gray-200 px-6 py-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm text-gray-500">© 2026 SignWell. All rights reserved.</p>
          <div className="mt-2 flex items-center justify-center gap-4 text-sm text-gray-400">
            <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <span aria-hidden="true">|</span>
            <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
          </div>
          <p className="mt-3 text-sm text-gray-400">Built for notaries, by notaries.</p>
        </div>
      </footer>
    </>
  );
}
