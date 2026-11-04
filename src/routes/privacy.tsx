import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BookScan AI" },
      { name: "description", content: "How BookScan AI handles your videos, pages and PDFs." },
      { property: "og:title", content: "Privacy Policy — BookScan AI" },
      { property: "og:description", content: "How BookScan AI handles your videos, pages and PDFs." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy">
      <h2>Your videos stay on your device</h2>
      <p>Book videos are analysed directly in your browser. They are never uploaded to our servers and are discarded when you leave the scan screen.</p>
      <h2>Text recognition</h2>
      <p>When you choose OCR, only the individual page images are sent to our AI provider to read the text. They are not stored by BookScan AI.</p>
      <h2>Your library</h2>
      <p>PDFs you save are stored privately in your account. Only you can access them. You can delete any file, or your whole account, at any time from Settings.</p>
      <h2>Account data</h2>
      <p>We store your email or phone number, display name and preferences to run your account. We do not sell your data.</p>
    </LegalPage>
  ),
});
