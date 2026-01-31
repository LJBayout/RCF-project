import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { Suspense, lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TourProvider, useTour } from "./contexts/TourContext";
import { TourGuide } from "./components/TourGuide";
import { ChatbotIcon } from "./components/ChatbotIcon";
import ProtectedRoute from "./components/ProtectedRoute";
import { ROUTES } from "./routes";

const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const AskCFR = lazy(() => import("./pages/AskCFR"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CFRBrowser = lazy(() => import("./pages/CFRBrowser"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <Switch>
        <Route path={ROUTES.login} component={Login} />
        <Route path={ROUTES.home}>
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.browsePartPattern}>
          <ProtectedRoute>
            <CFRBrowser />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.browseTitlePattern}>
          <ProtectedRoute>
            <CFRBrowser />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.browse}>
          <ProtectedRoute>
            <CFRBrowser />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.search}>
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.askCFR}>
          <ProtectedRoute>
            <AskCFR />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.docs}>
          <ProtectedRoute>
            <ApiDocs />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.dashboard}>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path={ROUTES.notFound} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function TourGate() {
  const { tourOpen, setTourOpen } = useTour();
  return (
    <>
      <TourGuide open={tourOpen} onOpenChange={setTourOpen} resetStep />
      <ChatbotIcon />
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TourProvider>
            <TourGate />
          </TourProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
