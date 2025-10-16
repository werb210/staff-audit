import { createBrowserRouter } from "react-router-dom";

// Force HubSpot-style v2 pages only
import Contacts from "./pages/staff/ContactsHubspot";
import Lenders from "./pages/staff/LendersDirectory";
import Pipeline from "./pages/staff/PipelineBoard";
import Comms from "./pages/staff/CommsHubV2";
import Settings from "./pages/staff/Settings";

export const router = createBrowserRouter([
  { path: "/", element: <Contacts/> },
  { path: "/dashboard", element: <Contacts/> },
  { path: "/contacts", element: <Contacts/> },
  { path: "/lenders", element: <Lenders/> },
  { path: "/sales-pipeline", element: <Pipeline/> },
  { path: "/communication", element: <Comms/> },
  { path: "/settings", element: <Settings/> },
]);