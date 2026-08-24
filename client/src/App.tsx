import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import KvorkaDetail from "./pages/KvorkaDetail";
import ProjectBoard from "./pages/ProjectBoard";
import ProjectDetail from "./pages/ProjectDetail";
import ContractorProfile from "./pages/ContractorProfile";
import CustomerDashboard from "./pages/dashboard/CustomerDashboard";
import ContractorDashboard from "./pages/dashboard/ContractorDashboard";
import AdminPanel from "./pages/admin/AdminPanel";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import AdsCabinet from "./pages/ads/AdsCabinet";
import ChatPage from "./pages/ChatPage";
import ProfileSetup from "./pages/ProfileSetup";
import PaymentPage from "./pages/PaymentPage";
import AuthPage from "./pages/AuthPage";
import DentalBooking from "./pages/dental/DentalBooking";
import DentalLeads from "./pages/dental/DentalLeads";
import DentalOptOut from "./pages/dental/DentalOptOut";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/catalog/:categorySlug" component={Catalog} />
      <Route path="/kvorka/:id" component={KvorkaDetail} />
      <Route path="/projects" component={ProjectBoard} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/contractor/:id" component={ContractorProfile} />
      <Route path="/dashboard/customer" component={CustomerDashboard} />
      <Route path="/dashboard/contractor" component={ContractorDashboard} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/owner" component={OwnerDashboard} />
      <Route path="/ads" component={AdsCabinet} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/chat/:userId" component={ChatPage} />
      <Route path="/profile/setup" component={ProfileSetup} />
      <Route path="/payments" component={PaymentPage} />
      <Route path="/dental" component={DentalBooking} />
      <Route path="/dental/leads" component={DentalLeads} />
      <Route path="/dental/opt-out" component={DentalOptOut} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
