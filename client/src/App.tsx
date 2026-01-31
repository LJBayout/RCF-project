import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { Suspense, lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CFRBrowser = lazy(() => import("./pages/CFRBrowser"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <Switch>
        <Route path={"/login"} component={Login} />
        <Route path={"/"}>
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        </Route>
        <Route path={"/browse"}>
          <ProtectedRoute>
            <CFRBrowser />
          </ProtectedRoute>
        </Route>
        <Route path={"/search"}>
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        </Route>
        <Route path={"/docs"}>
          <ProtectedRoute>
            <ApiDocs />
          </ProtectedRoute>
        </Route>
        <Route path={"/dashboard"}>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
