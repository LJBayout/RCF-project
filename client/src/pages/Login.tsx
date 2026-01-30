import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Lock, ShieldCheck } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(username, password);

    if (success) {
      setLocation("/");
    } else {
      setError("Invalid username or password");
      setPassword("");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">CFR Data Platform</CardTitle>
          <CardDescription>
            Enterprise-grade regulatory data access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              <Lock className="mr-2 h-4 w-4" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="pt-4 border-t">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                🔒 SOC 2 Type II Compliant
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">
                All access is logged and monitored
              </p>
            </div>

            {/* Dev credentials hint */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-xs">
              <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                Demo Credentials:
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Username: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">admin</code>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Password: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">admin</code>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
