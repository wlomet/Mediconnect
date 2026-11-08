import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [impersonatedBy, setImpersonatedBy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get("/user");
      setUser(response.data.user);
      setRoles(response.data.roles);
      setImpersonatedBy(response.data.impersonated_by ?? null);
    } catch (error) {
      console.log("Erreur checkAuth:", error);
      setUser(null);
      setImpersonatedBy(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post("/login", { email, password });
    setUser(response.data.user);
    // Récupérer les données complètes de l'utilisateur (avec rôles)
    await checkAuth();
    return response.data;
  };

  const register = async (name, email, password, phone, role, documents = {}) => {
    const fields = { name, email, password, phone, role };
    let body = fields;
    if (role === "medecin") {
      // Les documents de vérification sont envoyés en multipart
      body = new FormData();
      Object.entries({ ...fields, ...documents }).forEach(([key, value]) => body.append(key, value));
    }
    const response = await api.post("/register", body);
    return response.data;
  };

  const logout = async () => {
    let retourSuperAdmin = false;
    try {
      const response = await api.post("/logout");
      retourSuperAdmin = Boolean(response.data.retour_superadmin);
    } finally {
      // L'état local est réinitialisé même si la requête échoue (sauf retour au superadmin)
      if (!retourSuperAdmin) {
        setUser(null);
        setRoles([]);
        setImpersonatedBy(null);
      }
    }

    if (retourSuperAdmin) {
      await checkAuth();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, roles, impersonatedBy, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
