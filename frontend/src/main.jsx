import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import DirectorRequest from "./pages/public/DirectorRequest";
import ForgotPassword from "./pages/public/ForgotPassword";
import ResetPassword from "./pages/public/ResetPassword";
import ActivationRequise from "./pages/public/ActivationRequise";
import VerifyEmail from "./pages/public/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import MedecinProfile from "./pages/medecin/profile/MedecinProfile";
import PlanningMedecin from "./pages/medecin/planning/PlanningMedecin";
import DashboardMedecin from "./pages/medecin/dashboard/DashboardMedecin";
import SearchMedecin from "./pages/public/rdv/SearchMedecin";
import Home from "./pages/public/Home";
import HowItWorks from "./pages/public/HowItWorks";
import Specialites from "./pages/public/Specialites";
import Etablissements from "./pages/public/Etablissements";
import Professionnels from "./pages/public/Professionnels";
import About from "./pages/public/About";
import Faq from "./pages/public/Faq";
import Contact from "./pages/public/Contact";
import DashboardGestionnaire from "./pages/gestionnaire/dashboard/DashboardGestionnaire";
import DashboardDirecteur from "./pages/directeur/dashboard/DashboardDirecteur";
import CreateUsers from "./pages/directeur/create-users";
import HopitalInfo from "./pages/directeur/hopital/HopitalInfo";
import DashboardSecretaire from "./pages/secretaire/dashboard/DashboardSecretaire";
import DashboardSuperAdmin from "./pages/superadmin/dashboard/DashboardSuperAdmin";
import UtilisateursSuperAdmin from "./pages/superadmin/utilisateurs/UtilisateursSuperAdmin";
import RolesSuperAdmin from "./pages/superadmin/roles/RolesSuperAdmin";
import InactiviteSuperAdmin from "./pages/superadmin/inactivite/InactiviteSuperAdmin";
import EtablissementsSuperAdmin from "./pages/superadmin/etablissements/EtablissementsSuperAdmin";
import AntecedentsSuperAdmin from "./pages/superadmin/antecedents/AntecedentsSuperAdmin";
import SpecialitesSuperAdmin from "./pages/superadmin/specialites/SpecialitesSuperAdmin";
import RendezVousSuperAdmin from "./pages/superadmin/rendez-vous/RendezVousSuperAdmin";
import SuperAdminPdfTemplatesList from "./pages/superadmin/pdf-templates/SuperAdminPdfTemplatesList";
import SuperAdminPdfLogosPage from "./pages/superadmin/pdf-templates/SuperAdminPdfLogosPage";
import SuperAdminLayout from "./pages/superadmin/components/SuperAdminLayout";
import DashboardAdmin from "./pages/admin/dashboard/DashboardAdmin";
import DirectorRequests from "./pages/admin/directeur-requests/DirectorRequests";
import UserVerification from "./pages/admin/user-verification/UserVerification";
import DashboardUser from "./pages/user/dashboard/DashboardUser";
import MesRendezVous from "./pages/user/mes_RDV/MesRendezVous";
import ClientProfile from "./pages/user/profile/ClientProfile";
import MesDocuments from "./pages/user/mes_documents/MesDocuments";
import MesConsultations from "./pages/user/mes_consultations/MesConsultations";
import PendingApproval from "./pages/public/PendingApproval";
import PdfTemplatesList from "./pages/medecin/pdf-templates/PdfTemplatesList";
import PdfLogosPage from "./pages/medecin/pdf-templates/PdfLogosPage";
import PdfTemplateEditor from "./pages/medecin/pdf-templates/PdfTemplateEditor";
import ConsultationPopup from "./pages/medecin/consultations/ConsultationPopup";
import ConsultationsListe from "./pages/medecin/consultations/ConsultationsListe";
import ConsultationPage from "./pages/medecin/consultations/ConsultationPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
    <BrowserRouter>
      <ConsultationPopup />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<SearchMedecin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
        <Route path="/activation-compte" element={<ActivationRequise />} />
        <Route path="/verifier-email" element={<VerifyEmail />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/demande-directeur" element={<DirectorRequest />} />
        <Route path="/comment-ca-marche" element={<HowItWorks />} />
        <Route path="/specialites" element={<Specialites />} />
        <Route path="/etablissements" element={<Etablissements />} />
        <Route path="/professionnels-de-sante" element={<Professionnels />} />
        <Route path="/a-propos" element={<About />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/medecin/profile" element={<MedecinProfile />} />
        <Route path="/medecin/planning" element={<PlanningMedecin />} />
        <Route path="/medecin/dashboard" element={<DashboardMedecin />} />
        <Route path="/medecin/consultations" element={<ConsultationsListe />} />
        <Route path="/medecin/consultations/:id" element={<ConsultationPage />} />
        <Route path="/medecin/pdf-templates" element={<PdfTemplatesList />} />
        <Route path="/medecin/pdf-templates/logos" element={<PdfLogosPage />} />
        <Route path="/medecin/pdf-templates/:id" element={<PdfTemplateEditor />} />
        <Route path="/gestionnaire/dashboard" element={<DashboardGestionnaire />} />
        <Route path="/directeur/dashboard" element={<DashboardDirecteur />} />
        <Route path="/directeur/create-users" element={<CreateUsers />} />
        <Route path="/directeur/hopital" element={<HopitalInfo />} />
        <Route path="/directeur/pdf-templates" element={<PdfTemplatesList role="directeur" />} />
        <Route path="/directeur/pdf-templates/logos" element={<PdfLogosPage role="directeur" />} />
        <Route path="/directeur/pdf-templates/:id" element={<PdfTemplateEditor role="directeur" />} />
        <Route path="/secretaire/dashboard" element={<DashboardSecretaire />} />
        <Route element={<SuperAdminLayout />}>
          <Route path="/super-admin/dashboard" element={<DashboardSuperAdmin />} />
          <Route path="/super-admin/utilisateurs" element={<UtilisateursSuperAdmin />} />
          <Route path="/super-admin/roles" element={<RolesSuperAdmin />} />
          <Route path="/super-admin/inactivite" element={<InactiviteSuperAdmin />} />
          <Route path="/super-admin/etablissements" element={<EtablissementsSuperAdmin />} />
          <Route path="/super-admin/antecedents" element={<AntecedentsSuperAdmin />} />
          <Route path="/super-admin/specialites" element={<SpecialitesSuperAdmin />} />
          <Route path="/super-admin/rendez-vous" element={<RendezVousSuperAdmin />} />
          <Route path="/super-admin/pdf-templates" element={<SuperAdminPdfTemplatesList />} />
          <Route path="/super-admin/pdf-templates/logos" element={<SuperAdminPdfLogosPage />} />
        </Route>
        {/* L'éditeur fournit sa propre navbar (via getPdfContext) */}
        <Route path="/super-admin/pdf-templates/:id" element={<PdfTemplateEditor role="super-admin" />} />
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/demandes-directeurs" element={<DirectorRequests />} />
        <Route path="/admin/utilisateurs-verification" element={<UserVerification />} />
        <Route path="/user/dashboard" element={<DashboardUser />} />
        <Route path="/user/mes-rdv" element={<MesRendezVous />} />
        <Route path="/user/profile" element={<ClientProfile />} />
        <Route path="/user/documents" element={<MesDocuments />} />
        <Route path="/user/consultations" element={<MesConsultations />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);
