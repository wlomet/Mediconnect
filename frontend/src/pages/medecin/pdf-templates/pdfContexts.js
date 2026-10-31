import { directeurPdfApi, pdfApi } from "../../../api/pdfApi";
import NavbarMedecin from "../components/NavbarMedecin";
import DirectorNavbar from "../../directeur/utils/navbar";

/**
 * Configuration des pages modèles PDF selon le rôle connecté.
 * Les pages sont partagées entre médecin et directeur.
 */
export const getPdfContext = (role) =>
  role === "directeur"
    ? { api: directeurPdfApi, basePath: "/directeur/pdf-templates", Navbar: DirectorNavbar }
    : { api: pdfApi, basePath: "/medecin/pdf-templates", Navbar: NavbarMedecin };
