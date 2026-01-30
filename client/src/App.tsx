import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Search from "./pages/Search";
import ApiDocs from "./pages/ApiDocs";
import Dashboard from "./pages/Dashboard";
import CFRBrowser from "./pages/CFRBrowser";
import Login from "./pages/Login";

function Router() {
  return (
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
