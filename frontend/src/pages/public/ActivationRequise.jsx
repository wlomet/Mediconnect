import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import Navbar from "./Navbar";

const DELAI_RENVOI = 60;

export default function ActivationRequise() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Email transmis par la connexion ou l'inscription, sinon par l'URL
  const email = location.state?.email || searchParams.get("email") || "";
  const medecin = Boolean(location.state?.medecin);

  const [secondes, setSecondes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (secondes <= 0) return undefined;
    const timer = setTimeout(() => setSecondes((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondes]);

  const renvoyer = async () => {
    setLoading(true);
    try {
      const res = await api.post("/resend-verification", { email });
      toast.success(res.data?.message || "Un email d'activation a été envoyé.");
      setSecondes(DELAI_RENVOI);
    } catch (err) {
      if (err.response?.status === 429) {
        toast.info(err.response.data?.message || "Veuillez patienter avant de réessayer.");
        setSecondes(err.response.data?.retry_after || DELAI_RENVOI);
      } else {
        toast.error("Impossible d'envoyer l'email. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-7 w-7 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Activez votre compte</h2>

          {email ? (
            <p className="text-gray-600 mb-4">
              Votre compte n'est pas encore activé. Ouvrez le lien d'activation reçu à l'adresse{" "}
              <span className="font-medium text-gray-800">{email}</span> pour pouvoir vous connecter.
            </p>
          ) : (
            <p className="text-gray-600 mb-4">
              Votre compte n'est pas encore activé. Ouvrez le lien d'activation reçu par email pour pouvoir vous
              connecter.
            </p>
          )}

          {medecin && (
            <p className="text-gray-600 mb-4">
              Une fois votre email confirmé, votre compte médecin sera validé par un administrateur.
            </p>
          )}

          <p className="text-sm text-gray-500 mb-8">
            Pensez à vérifier vos courriers indésirables. Le lien est valable 24 heures.
          </p>

          {email && (
            <button
              type="button"
              onClick={renvoyer}
              disabled={loading || secondes > 0}
              className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {secondes > 0
                ? `Renvoyer l'email dans ${secondes} s`
                : loading
                  ? "Envoi en cours..."
                  : "Renvoyer l'email d'activation"}
            </button>
          )}

          <div className="mt-6">
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
