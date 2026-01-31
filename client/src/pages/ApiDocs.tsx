import { Navbar } from "@/components/Navbar";

const SWAGGER_PATH = "/api-docs";

export default function ApiDocs() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
          Interactive API reference (Swagger). Try endpoints directly from the browser.
        </div>
        <iframe
          title="Swagger API Documentation"
          src={SWAGGER_PATH}
          className="flex-1 w-full min-h-0 border-0"
        />
      </div>
    </div>
  );
}
