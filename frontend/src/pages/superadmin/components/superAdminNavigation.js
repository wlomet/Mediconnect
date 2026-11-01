import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  UserX,
  Users,
} from "lucide-react";

// Source unique des liens superadmin : navbar et cartes du tableau de bord
export const NAV_ACCUEIL = {
  to: "/super-admin/dashboard",
  label: "Tableau de bord",
  icon: LayoutDashboard,
};

export const NAV_GROUPES = [
  {
    id: "comptes",
    label: "Comptes",
    icon: Users,
    liens: [
      {
        to: "/super-admin/utilisateurs",
        label: "Utilisateurs",
        icon: Users,
        description: "Créer des comptes, modifier les informations, activer ou masquer un utilisateur.",
      },
      {
        to: "/super-admin/roles",
        label: "Rôles",
        icon: ShieldCheck,
        description: "Assigner un rôle à un utilisateur et voir la répartition des rôles.",
      },
      {
        to: "/super-admin/inactivite",
        label: "Comptes inactifs",
        icon: UserX,
        description: "Consulter les comptes et établissements inactifs prévus pour suppression.",
      },
    ],
  },
  {
    id: "etablissements",
    label: "Établissements & rendez-vous",
    icon: Building2,
    liens: [
      {
        to: "/super-admin/etablissements",
        label: "Établissements",
        icon: Building2,
        description: "Masquer un établissement et gérer la visibilité de ses médecins.",
      },
      {
        to: "/super-admin/rendez-vous",
        label: "Rendez-vous",
        icon: CalendarDays,
        description: "Consulter tous les rendez-vous, filtrer, rechercher et exporter en CSV.",
      },
    ],
  },
  {
    id: "referentiels",
    label: "Référentiels & documents",
    icon: ClipboardList,
    liens: [
      {
        to: "/super-admin/antecedents",
        label: "Antécédents",
        icon: ClipboardList,
        description: "Ajouter, modifier ou désactiver les options d'antécédents proposées aux patients.",
      },
      {
        to: "/super-admin/specialites",
        label: "Spécialités",
        icon: Stethoscope,
        description: "Gérer la liste des spécialités proposées aux médecins et aux patients.",
      },
      {
        to: "/super-admin/pdf-templates",
        label: "Modèles PDF",
        icon: FileText,
        description: "Créer et modifier ordonnances et factures, gérer les logos et images.",
      },
    ],
  },
];
