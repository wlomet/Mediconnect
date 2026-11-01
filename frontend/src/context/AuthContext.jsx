import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get("/user");
      setUser(response.data.user);
      setRoles(response.data.roles);
    } catch (error) {
      console.log("Erreur checkAuth:", error);
      setUser(null);
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
    try {
      await api.post("/logout");
    } finally {
      // L'état local est réinitialisé même si la requête échoue
      setUser(null);
      setRoles([]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, roles, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
