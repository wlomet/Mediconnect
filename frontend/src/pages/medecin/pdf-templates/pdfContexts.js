import { directeurPdfApi, pdfApi } from "../../../api/pdfApi";
import { superAdminPdfApi } from "../../../api/superAdminApi";
import NavbarMedecin from "../components/NavbarMedecin";
import DirectorNavbar from "../../directeur/utils/navbar";
import SuperAdminNavbar from "../../superadmin/components/SuperAdminNavbar";

/**
 * Configuration des pages modèles PDF selon le rôle connecté.
 * Les pages sont partagées entre médecin, directeur et superadmin.
 * @param {"medecin"|"directeur"|"super-admin"} role
 * @param {{template_id?: number}|null} scope cible de l'API superadmin (modèle édité)
 */
export const getPdfContext = (role, scope = null) => {
  if (role === "directeur") {
    return { api: directeurPdfApi, basePath: "/directeur/pdf-templates", Navbar: DirectorNavbar };
  }

  if (role === "super-admin") {
    return {
      api: superAdminPdfApi(scope ?? {}),
      basePath: "/super-admin/pdf-templates",
      Navbar: SuperAdminNavbar,
    };
  }

  return { api: pdfApi, basePath: "/medecin/pdf-templates", Navbar: NavbarMedecin };
};
