import { Navbar } from "@/components/Navbar";

const SWAGGER_PATH = "/api-docs";

export default function ApiDocs() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex flex-col min-h-0" data-tour="docs">
        <iframe
          title="Swagger API Documentation"
          src={SWAGGER_PATH}
          className="flex-1 w-full min-h-0 border-0"
        />
      </div>
    </div>
  );
}
