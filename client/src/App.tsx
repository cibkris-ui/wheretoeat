import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RestaurantDetail from "@/pages/RestaurantDetail";
import Dashboard from "@/pages/Dashboard";
import RestaurateurRegister from "@/pages/RestaurateurRegister";
import Admin from "@/pages/Admin";
import Restaurants from "@/pages/Restaurants";
import NewBooking from "@/pages/NewBooking";
import Calendar from "@/pages/Calendar";
import Notifications from "@/pages/Notifications";
import Clients from "@/pages/Clients";
import Statistics from "@/pages/Statistics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/restaurants" component={Restaurants} />
      <Route path="/restaurant/:id" component={RestaurantDetail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/nouvelle-reservation" component={NewBooking} />
      <Route path="/dashboard/calendrier" component={Calendar} />
      <Route path="/dashboard/notifications" component={Notifications} />
      <Route path="/dashboard/clients" component={Clients} />
      <Route path="/dashboard/statistiques" component={Statistics} />
      <Route path="/inscrire-restaurant" component={RestaurateurRegister} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
