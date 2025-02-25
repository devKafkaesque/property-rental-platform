import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ViewPropertyPage from "@/pages/property-page";
import ManagePropertyPage from "@/pages/manage-property-page";
import Dashboard from "@/pages/dashboard";
import ConnectPage from "@/pages/connect";
import ConnectionsDashboard from "@/pages/connections-dashboard";
import { ChatContainer } from "@/components/chat/chat-container";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/connect" component={ConnectPage} />
      <ProtectedRoute path="/connections" component={ConnectionsDashboard} />
      <ProtectedRoute path="/chat" component={ChatContainer} />
      <Route path="/property/:id" component={ViewPropertyPage} />
      <ProtectedRoute path="/property/:id/manage" component={ManagePropertyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;