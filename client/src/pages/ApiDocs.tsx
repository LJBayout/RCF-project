import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Key, Search, Database } from "lucide-react";

export default function ApiDocs() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="container py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">API Documentation</h1>
          <p className="text-xl text-muted-foreground">
            Complete reference for the CFR Data API
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Quick Start</CardTitle>
            </div>
            <CardDescription>Get started with the CFR Data API in minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Get your API Key</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Sign up for a free account and generate your API key from the dashboard.
              </p>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                API_KEY=your_api_key_here
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Make your first request</h4>
              <p className="text-sm text-muted-foreground mb-2">
                All API requests require authentication via the <code className="bg-muted px-1 rounded">X-API-Key</code> header.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Base URL</h4>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                https://api.cfrdata.com/v1
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Endpoints</h2>

          {/* Full-Text Search */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  <CardTitle>Full-Text Search</CardTitle>
                </div>
                <Badge>GET</Badge>
              </div>
              <CardDescription className="font-mono text-sm">
                /api/search/fulltext
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  Search across all CFR content using keywords. Supports advanced filtering by title, part, and section.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Query Parameters</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <code className="bg-muted px-2 py-1 rounded">q</code>
                    <span className="text-muted-foreground">Search query (required)</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="bg-muted px-2 py-1 rounded">title</code>
                    <span className="text-muted-foreground">Filter by title number (optional)</span>
                  </div>
                  <div className="flex gap-2">
                    <code className="bg-muted px-2 py-1 rounded">limit</code>
                    <span className="text-muted-foreground">Number of results (default: 10, max: 100)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example Request</h4>
                <Tabs defaultValue="curl">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                      <pre>{`curl -X GET "https://api.cfrdata.com/v1/api/search/fulltext?q=vessel&title=19" \\
  -H "X-API-Key: your_api_key_here"`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="python">
                    <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                      <pre>{`import requests

headers = {"X-API-Key": "your_api_key_here"}
params = {"q": "vessel", "title": "19"}

response = requests.get(
    "https://api.cfrdata.com/v1/api/search/fulltext",
    headers=headers,
    params=params
)

data = response.json()
print(data)`}</pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="javascript">
                    <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                      <pre>{`const response = await fetch(
  'https://api.cfrdata.com/v1/api/search/fulltext?q=vessel&title=19',
  {
    headers: {
      'X-API-Key': 'your_api_key_here'
    }
  }
);

const data = await response.json();
console.log(data);`}</pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example Response</h4>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`{
  "results": [
    {
      "id": 1,
      "title": 19,
      "titleName": "Customs Duties",
      "part": 4,
      "partName": "Vessels in foreign and domestic trades",
      "section": "4.0",
      "subject": "General definitions",
      "content": "For the purposes of this part: (a) Vessel...",
      "relevance": 0.95
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Get by Title */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle>Get Title</CardTitle>
                </div>
                <Badge>GET</Badge>
              </div>
              <CardDescription className="font-mono text-sm">
                /api/title/:titleNumber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  Retrieve complete information about a specific CFR title, including all parts and sections.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Path Parameters</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <code className="bg-muted px-2 py-1 rounded">titleNumber</code>
                    <span className="text-muted-foreground">Title number (1-50)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example Request</h4>
                <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  <pre>{`curl -X GET "https://api.cfrdata.com/v1/api/title/19" \\
  -H "X-API-Key: your_api_key_here"`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Get Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <CardTitle>Get Section</CardTitle>
                </div>
                <Badge>GET</Badge>
              </div>
              <CardDescription className="font-mono text-sm">
                /api/section/:sectionId
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  Retrieve the full content of a specific CFR section by its ID.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Path Parameters</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <code className="bg-muted px-2 py-1 rounded">sectionId</code>
                    <span className="text-muted-foreground">Section ID</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rate Limits */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
            <CardDescription>API request limits by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">Free Plan</span>
                <Badge variant="secondary">100 requests/day</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Pro Plan</span>
                <Badge variant="secondary">10,000 requests/day</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Enterprise Plan</span>
                <Badge variant="secondary">Unlimited</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Rate limit information is included in response headers: <code className="bg-muted px-1 rounded">X-RateLimit-Limit</code>, <code className="bg-muted px-1 rounded">X-RateLimit-Remaining</code>, <code className="bg-muted px-1 rounded">X-RateLimit-Reset</code>
            </p>
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Error Codes</CardTitle>
            <CardDescription>Common HTTP status codes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <Badge variant="outline" className="shrink-0">200</Badge>
                <span>Success - Request completed successfully</span>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="shrink-0">400</Badge>
                <span>Bad Request - Invalid parameters</span>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="shrink-0">401</Badge>
                <span>Unauthorized - Invalid or missing API key</span>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="shrink-0">429</Badge>
                <span>Too Many Requests - Rate limit exceeded</span>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="shrink-0">500</Badge>
                <span>Internal Server Error - Server error</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
