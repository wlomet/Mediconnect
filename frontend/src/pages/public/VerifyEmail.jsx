import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX } from "lucide-react";
import api from "../../api/axios";
import Navbar from "./Navbar";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();

  // Token et email transmis par le lien reçu dans l'email
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [etat, setEtat] = useState("chargement");
  const [message, setMessage] = useState("");
  const demandeEnvoyee = useRef(false);

  useEffect(() => {
    if (!token || !email) {
      setEtat("erreur");
      setMessage("Ce lien d'activation est incomplet.");
      return;
    }

    // Le token n'est utilisable qu'une fois : pas de double appel
    if (demandeEnvoyee.current) return;
    demandeEnvoyee.current = true;

    api
      .post("/verify-email", { token, email })
      .then((res) => {
        setEtat("succes");
        setMessage(res.data?.message || "Votre adresse email est vérifiée.");
      })
      .catch((err) => {
        setEtat("erreur");
        setMessage(err.response?.data?.message || "Impossible d'activer votre compte. Veuillez réessayer.");
      });
  }, [token, email]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          {etat === "chargement" && (
            <p className="text-gray-600">Activation de votre compte en cours...</p>
          )}

          {etat === "succes" && (
            <>
              <CircleCheck className="mx-auto mb-4 h-12 w-12 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Compte activé</h2>
              <p className="text-gray-600 mb-8">{message}</p>
              <Link
                to="/login"
                className="inline-block w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Se connecter
              </Link>
            </>
          )}

          {etat === "erreur" && (
            <>
              <CircleX className="mx-auto mb-4 h-12 w-12 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Activation impossible</h2>
              <p className="text-gray-600 mb-8">{message}</p>
              {email && (
                <Link
                  to="/activation-compte"
                  state={{ email }}
                  className="inline-block w-full py-3 mb-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  Demander un nouvel email d'activation
                </Link>
              )}
              <div>
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
