import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { pdfApi as defaultPdfApi } from "../../../api/pdfApi";
import styles from "./PdfImageLibrary.module.css";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

const TYPE_OPTIONS = [
  { value: "logo", label: "Logos", empty: "Aucun logo enregistré." },
  { value: "image", label: "Images", empty: "Aucune image enregistrée." },
];

/**
 * @param {"logo"|"image"|null} type type fixe ; sans type, des onglets permettent de passer de l'un à l'autre
 */
export default function PdfImageLibrary({
  type = null,
  selectedId = null,
  onUse = null,
  onChange = null,
  api = defaultPdfApi,
}) {
  const [tab, setTab] = useState("logo");
  const [images, setImages] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const activeType = type ?? tab;
  const activeOption = TYPE_OPTIONS.find((option) => option.value === activeType);

  const loadImages = async () => {
    try {
      setLoading(true);
      setImages(await api.listImages(activeType));
    } catch {
      toast.error("Impossible de charger la bibliothèque");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [activeType]);

  useEffect(() => {
    let cancelled = false;
    const created = [];

    const loadThumbnails = async () => {
      const next = {};
      for (const image of images) {
        try {
          const { bytes, mime } = await api.fetchImageBytes(image.id);
          const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
          created.push(url);
          next[image.id] = url;
        } catch {
          // Miniature absente : le logo reste utilisable
        }
      }
      if (!cancelled) setThumbnails(next);
    };

    loadThumbnails();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Format non accepté : PNG ou JPG uniquement");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image trop lourde : 2 Mo maximum");
      return;
    }

    try {
      setUploading(true);
      await api.uploadImage(file, activeType);
      toast.success("Image ajoutée");
      loadImages();
      onChange?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Envoi impossible");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image) => {
    const result = await Swal.fire({
      title: "Supprimer cette image ?",
      text: image.hopital_id
        ? "Cette image est partagée avec l'établissement. Les modèles qui l'utilisent devront être mis à jour."
        : "Les modèles qui l'utilisent devront être mis à jour.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;

    try {
      await api.deleteImage(image.id);
      toast.success("Image supprimée");
      loadImages();
      onChange?.();
    } catch {
      toast.error("Suppression impossible");
    }
  };

  return (
    <div className={styles.library}>
      <div className={styles.header}>
        {type ? (
          <h3 className={styles.title}>{activeOption.label}</h3>
        ) : (
          <div className={styles.tabs} role="tablist">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={tab === option.value}
                className={`${styles.tab} ${tab === option.value ? styles.tabActive : ""}`}
                onClick={() => setTab(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={styles.uploadButton}
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Envoi..." : "Ajouter"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleUpload}
          hidden
        />
      </div>
      <p className={styles.hint}>PNG ou JPG, 2 Mo maximum</p>

      {loading ? (
        <p className={styles.hint}>Chargement...</p>
      ) : images.length === 0 ? (
        <p className={styles.hint}>{activeOption.empty}</p>
      ) : (
        <ul className={styles.list}>
          {images.map((image) => (
            <li
              key={image.id}
              className={`${styles.item} ${selectedId === image.id ? styles.selected : ""}`}
            >
              <div className={styles.thumb}>
                {thumbnails[image.id] ? <img src={thumbnails[image.id]} alt={image.nom} /> : null}
              </div>
              <div className={styles.info}>
                <span className={styles.name} title={image.nom}>{image.nom}</span>
                {image.hopital_id && <span className={styles.sharedBadge}>Établissement</span>}
              </div>
              <div className={styles.itemActions}>
                {onUse && (
                  <button type="button" className={styles.useButton} onClick={() => onUse(image)}>
                    Utiliser
                  </button>
                )}
                <button type="button" className={styles.deleteButton} onClick={() => handleDelete(image)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
