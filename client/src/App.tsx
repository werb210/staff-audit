import { Route } from "wouter";
import { Dashboard } from "./pages/Dashboard";
import { NotFound } from "./pages/NotFound";

const App = () => {
  return (
    <>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="*" component={NotFound} />
    </>
  );
};

export default App;
