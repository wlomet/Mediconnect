import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Fonction pour récupérer le CSRF token
const getCSRFToken = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const xsrfToken = getCookie("XSRF-TOKEN");
    return xsrfToken;
  } catch (error) {
    return null;
  }
};

// Helper function pour récupérer les cookies
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

// Intercepteur pour ajouter le CSRF token et le Bearer token
api.interceptors.request.use(async (config) => {
  if (!config.url.includes("sanctum/csrf-cookie")) {
    let xsrfToken = getCookie("XSRF-TOKEN");

    if (!xsrfToken) {
      xsrfToken = await getCSRFToken();
    }

    if (xsrfToken) {
      config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
    }
  }

  // Ajouter le Bearer token
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

// Intercepteur de réponse : forcer la déconnexion si le compte a été désactivé en cours de session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response?.data?.isDisabled) {
      localStorage.removeItem("token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);


// Intercepteur de réponse pour debug
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
