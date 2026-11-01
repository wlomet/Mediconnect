import { Outlet } from "react-router-dom";
import SuperAdminNavbar from "./SuperAdminNavbar";

// Navbar commune à toutes les pages superadmin (sauf l'éditeur de modèle, qui fournit la sienne)
const SuperAdminLayout = ({ children }) => (
  <>
    <SuperAdminNavbar />
    {children ?? <Outlet />}
  </>
);

export default SuperAdminLayout;
