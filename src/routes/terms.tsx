import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ title: "Terms of Service — SignWell" }),
  component: Terms,
});

function Terms() {
  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
          <p>
            Welcome to SignWell. By accessing or using our platform, you agree to be bound
            by these Terms of Service ("Terms"). Please read them carefully.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using SignWell, you agree to these Terms. If you do
            not agree, you may not use the service.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">2. Description of Service</h2>
          <p>
            SignWell provides a software platform for notaries and loan signing agents to
            manage scheduling, document preparation, signings, invoicing, and digital
            journaling.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">3. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account
            credentials and for all activity under your account. You agree to use SignWell
            in compliance with all applicable notary laws and regulations in your
            jurisdiction.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">4. Subscription and Payment</h2>
          <p>
            SignWell offers subscription-based access. Fees are billed monthly and are
            non-refundable except as required by law. You may cancel your subscription at
            any time.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">5. Limitation of Liability</h2>
          <p>
            SignWell is provided "as is" without warranties of any kind. We are not liable
            for any damages arising from your use of the platform, to the fullest extent
            permitted by law.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">6. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:legal@signwell.app" className="text-indigo-600 hover:underline">
              legal@signwell.app
            </a>.
          </p>
        </div>

        <div className="mt-12">
          <a
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
