import { useNavigate } from "react-router-dom";
import PdfImageLibrary from "./PdfImageLibrary";
import { getPdfContext } from "./pdfContexts";
import styles from "./PdfLogosPage.module.css";

export default function PdfLogosPage({ role = "medecin" }) {
  const navigate = useNavigate();
  const { api, basePath, Navbar } = getPdfContext(role);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => navigate(basePath)}>
            Retour aux modèles
          </button>
          <h1 className={styles.title}>Bibliothèque d'images</h1>
        </div>
        <div className={styles.panel}>
          <PdfImageLibrary api={api} />
        </div>
      </div>
    </>
  );
}
