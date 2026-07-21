import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ title: "Privacy Policy — SignWell" }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: July 2026</p>

        <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
          <p>
            SignWell ("we," "our," or "us") is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our platform.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
          <p>
            We collect information you provide directly, such as your name, email address,
            and business details when you create an account. We also collect information
            about your use of the platform, including signing activity, document metadata,
            and journal entries.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">How We Use Your Information</h2>
          <p>
            We use your information to provide, maintain, and improve our services; to
            communicate with you about your account; and to comply with legal obligations
            applicable to notarial records.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data. Notary
            journal records are encrypted at rest and in transit.
          </p>

          <h2 className="text-xl font-semibold text-gray-900">Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:privacy@signwell.app" className="text-indigo-600 hover:underline">
              privacy@signwell.app
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
