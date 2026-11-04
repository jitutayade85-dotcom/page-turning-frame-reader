import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — BookScan AI" },
      { name: "description", content: "The terms for using BookScan AI." },
      { property: "og:title", content: "Terms & Conditions — BookScan AI" },
      { property: "og:description", content: "The terms for using BookScan AI." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Terms & Conditions">
      <h2>Respect copyright</h2>
      <p>Only scan books and documents you own or have permission to digitize. You are responsible for how you use the PDFs you create.</p>
      <h2>No DRM circumvention</h2>
      <p>BookScan AI must not be used to bypass DRM, paywalls or other access restrictions.</p>
      <h2>Accuracy</h2>
      <p>Page detection and OCR are automated and may contain mistakes. BookScan AI never invents missing content; always review your PDF before relying on it.</p>
      <h2>Free service</h2>
      <p>Accounts are free. We may apply fair-use limits on file size and processing to keep the service reliable for everyone.</p>
    </LegalPage>
  ),
});
