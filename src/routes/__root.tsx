import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SignWell — Notary Business Management Software" },
      {
        name: "description",
        content:
          "All-in-one platform for notaries and loan signing agents. Schedule signings, manage documents, track invoices, and keep a compliant digital journal.",
      },
      {
        name: "keywords",
        content:
          "notary software, loan signing agent, notary journal, signing agent software, mobile notary, notary business management",
      },
      { property: "og:title", content: "SignWell — Notary Business Management Software" },
      {
        property: "og:description",
        content:
          "All-in-one platform for notaries and loan signing agents. Schedule signings, manage documents, track invoices, and keep a compliant digital journal.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://site-13hs94uef-lyssa.vercel.app" },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
