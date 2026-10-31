import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { toast } from "react-toastify";
import PdfImageLibrary from "./PdfImageLibrary";
import { getPdfContext } from "./pdfContexts";
import { fetchImagesForLayout } from "../../../api/pdfApi";
import { generatePdf } from "../../../utils/pdf/generatePdf";
import { ELEMENT_TYPES, PAGE_SIZES, VARIABLES, createElement, normalizeLayout, slugify } from "../../../utils/pdf/layout";
import styles from "./PdfTemplateEditor.module.css";

// Pixels écran par point PDF
const SCALE = 0.85;
const MIN_SIZE = 10;
const PAGE = PAGE_SIZES.A4;

const newId = () => `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const buildSampleData = () => ({
  medecin: {
    nom: "Dr Jean Exemple",
    specialite: "Médecine générale",
    hopital: "Clinique Exemple",
    adresse: "1 rue de la Santé",
    ville: "Paris",
    telephone: "01 00 00 00 00",
  },
  patient: { nom: "Patient Exemple", email: "patient@exemple.fr", telephone: "06 00 00 00 00" },
  rendez_vous: { date: "01/01/2026", heure: "09:00", motif: "Consultation" },
  date_jour: new Date().toLocaleDateString("fr-FR"),
});

const buildSampleValues = (elements) =>
  elements.reduce((acc, el) => {
    if (el.type === "saisie") acc[el.key] = `[${el.label}]`;
    if (el.type === "tableau") {
      acc[el.key] = [Object.fromEntries((el.columns ?? []).map((col) => [col.key, `[${col.label}]`]))];
    }
    return acc;
  }, {});

function useLoadedImage(url) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return undefined;
    }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url]);

  return image;
}

function LogoContent({ pdfImageId, url, width, height }) {
  const image = useLoadedImage(url);

  if (!pdfImageId) {
    return <Text text="Logo non sélectionné" width={width} height={height} align="center" fill="#94a3b8" fontSize={12} />;
  }
  if (!image) {
    return <Rect width={width} height={height} stroke="#94a3b8" dash={[4, 3]} />;
  }

  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  return <KonvaImage image={image} x={(width - w) / 2} y={(height - h) / 2} width={w} height={h} />;
}

function TableContent({ element, width, height }) {
  const columns = element.columns ?? [];
  const colWidth = width / Math.max(columns.length, 1);
  const fontSize = element.fontSize * SCALE;
  const headerHeight = fontSize * 1.8;

  return (
    <>
      <Rect width={width} height={height} stroke="#cbd5e1" />
      {columns.map((column, index) => (
        <Text
          key={`${column.key}-${index}`}
          x={index * colWidth + 4}
          y={4}
          width={colWidth - 8}
          text={column.label}
          fontSize={fontSize}
          fontStyle="bold"
          fill={element.color}
        />
      ))}
      <Line points={[0, headerHeight, width, headerHeight]} stroke="#94a3b8" />
    </>
  );
}

function ElementContent({ element, width, height, logoUrl }) {
  const common = {
    width,
    fontSize: element.fontSize * SCALE,
    fill: element.color,
    align: element.align,
    fontStyle: element.bold ? "bold" : "normal",
    fontFamily: "Helvetica, Arial, sans-serif",
  };

  switch (element.type) {
    case "texte":
      return <Text {...common} text={element.text || " "} />;
    case "variable":
      return <Text {...common} fill="#2563eb" text={`{${element.source}}`} />;
    case "saisie":
      return <Text {...common} fill="#64748b" fontStyle="italic" text={`[${element.label}]`} />;
    case "tableau":
      return <TableContent element={element} width={width} height={height} />;
    case "image":
      return (
        <LogoContent pdfImageId={element.pdf_image_id} url={logoUrl} width={width} height={height} />
      );
    default:
      return null;
  }
}

function CanvasElement({ element, isSelected, logoUrl, onSelect, onChange, registerNode, readOnly = false }) {
  const width = element.width * SCALE;
  const height = element.height * SCALE;

  return (
    <Group
      ref={(node) => registerNode(element.id, node)}
      x={element.x * SCALE}
      y={element.y * SCALE}
      draggable={!readOnly}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x() / SCALE, y: e.target.y() / SCALE })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x() / SCALE,
          y: node.y() / SCALE,
          width: Math.max(MIN_SIZE, element.width * scaleX),
          height: Math.max(MIN_SIZE, element.height * scaleY),
        });
      }}
    >
      <Rect width={width} height={height} fill="#000000" opacity={0} />
      <ElementContent element={element} width={width} height={height} logoUrl={logoUrl} />
      {isSelected && <Rect width={width} height={height} stroke="#0d9488" dash={[4, 3]} listening={false} />}
    </Group>
  );
}

function ColumnsField({ columns, onCommit }) {
  const [draft, setDraft] = useState(() => (columns ?? []).map((c) => c.label).join(", "));

  const commit = () => {
    const labels = draft.split(",").map((label) => label.trim()).filter(Boolean);
    onCommit(labels.map((label, index) => ({ key: slugify(label) || `col_${index}`, label })));
  };

  return (
    <label className={styles.field}>
      Colonnes (séparées par des virgules)
      <input
        className={styles.input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    </label>
  );
}

function PropertiesPanel({ element, images, onChange, onDelete }) {
  const hasText = ["texte", "variable", "saisie", "tableau"].includes(element.type);

  return (
    <div className={styles.panelBody}>
      <h3 className={styles.panelTitle}>{ELEMENT_TYPES[element.type]}</h3>

      <div className={styles.grid2}>
        <label className={styles.field}>
          X (pt)
          <input className={styles.input} type="number" value={Math.round(element.x)} onChange={(e) => onChange({ x: Number(e.target.value) })} />
        </label>
        <label className={styles.field}>
          Y (pt)
          <input className={styles.input} type="number" value={Math.round(element.y)} onChange={(e) => onChange({ y: Number(e.target.value) })} />
        </label>
        <label className={styles.field}>
          Largeur (pt)
          <input className={styles.input} type="number" min={MIN_SIZE} value={Math.round(element.width)} onChange={(e) => onChange({ width: Math.max(MIN_SIZE, Number(e.target.value)) })} />
        </label>
        <label className={styles.field}>
          Hauteur (pt)
          <input className={styles.input} type="number" min={MIN_SIZE} value={Math.round(element.height)} onChange={(e) => onChange({ height: Math.max(MIN_SIZE, Number(e.target.value)) })} />
        </label>
      </div>

      {hasText && (
        <div className={styles.grid2}>
          <label className={styles.field}>
            Taille police
            <input className={styles.input} type="number" min={6} max={48} value={element.fontSize} onChange={(e) => onChange({ fontSize: Number(e.target.value) })} />
          </label>
          <label className={styles.field}>
            Couleur
            <input className={styles.input} type="color" value={element.color} onChange={(e) => onChange({ color: e.target.value })} />
          </label>
          <label className={styles.field}>
            Alignement
            <select className={styles.input} value={element.align} onChange={(e) => onChange({ align: e.target.value })}>
              <option value="left">Gauche</option>
              <option value="center">Centre</option>
              <option value="right">Droite</option>
            </select>
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" checked={element.bold} onChange={(e) => onChange({ bold: e.target.checked })} />
            Gras
          </label>
        </div>
      )}

      {element.type === "texte" && (
        <label className={styles.field}>
          Texte
          <textarea className={styles.textarea} rows={4} value={element.text} onChange={(e) => onChange({ text: e.target.value })} />
        </label>
      )}

      {element.type === "variable" && (
        <label className={styles.field}>
          Donnée
          <select className={styles.input} value={element.source} onChange={(e) => onChange({ source: e.target.value })}>
            {VARIABLES.map((variable) => (
              <option key={variable.path} value={variable.path}>{variable.label}</option>
            ))}
          </select>
        </label>
      )}

      {element.type === "saisie" && (
        <label className={styles.field}>
          Libellé du champ (saisi à la génération)
          <input
            className={styles.input}
            value={element.label}
            onChange={(e) => onChange({ label: e.target.value, key: slugify(e.target.value) || "saisie" })}
          />
        </label>
      )}

      {element.type === "tableau" && (
        <>
          <label className={styles.field}>
            Libellé du tableau
            <input
              className={styles.input}
              value={element.label}
              onChange={(e) => onChange({ label: e.target.value, key: slugify(e.target.value) || "lignes" })}
            />
          </label>
          <ColumnsField key={element.id} columns={element.columns} onCommit={(columns) => onChange({ columns })} />
        </>
      )}

      {element.type === "image" && (
        <label className={styles.field}>
          Logo
          <select
            className={styles.input}
            value={element.pdf_image_id ?? ""}
            onChange={(e) => onChange({ pdf_image_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">-- Aucun --</option>
            {images.map((image) => (
              <option key={image.id} value={image.id}>{image.nom}</option>
            ))}
          </select>
        </label>
      )}

      <button type="button" className={styles.dangerButton} onClick={onDelete}>
        Supprimer l'élément
      </button>
    </div>
  );
}

export default function PdfTemplateEditor({ role = "medecin" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, basePath, Navbar } = getPdfContext(role);
  const [readOnly, setReadOnly] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("ordonnance");
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const transformerRef = useRef(null);
  const nodeRefs = useRef({});

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const pageWidth = PAGE.width * SCALE;
  const pageHeight = PAGE.height * SCALE;

  const loadImages = useCallback(async () => {
    try {
      setImages(await api.listImages());
    } catch {
      toast.error("Impossible de charger les logos");
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  useEffect(() => {
    const load = async () => {
      try {
        const template = await api.getTemplate(id);
        setNom(template.nom);
        setType(template.type);
        setReadOnly(template.editable === false);
        setElements(normalizeLayout(template.layout).elements);
      } catch {
        toast.error("Modèle introuvable");
        navigate(basePath);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  // Logos de la bibliothèque et logos utilisés par le modèle (ex. logo partagé par l'établissement)
  const logoKey = [...new Set([...images.map((image) => image.id), ...elements.map((el) => el.pdf_image_id).filter(Boolean)])].join(",");

  useEffect(() => {
    let cancelled = false;
    const created = [];

    const loadUrls = async () => {
      const urls = {};
      for (const id of logoKey.split(",").filter(Boolean)) {
        try {
          const { bytes, mime } = await api.fetchImageBytes(id);
          const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
          created.push(url);
          urls[id] = url;
        } catch {
          // Logo non disponible : affiché en placeholder
        }
      }
      if (!cancelled) setImageUrls(urls);
    };

    loadUrls();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [logoKey]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedId ? nodeRefs.current[selectedId] : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  const registerNode = useCallback((elementId, node) => {
    if (node) {
      nodeRefs.current[elementId] = node;
    } else {
      delete nodeRefs.current[elementId];
    }
  }, []);

  const updateElement = (elementId, changes) => {
    setElements((prev) => prev.map((el) => (el.id === elementId ? { ...el, ...changes } : el)));
  };

  const removeElement = (elementId) => {
    setElements((prev) => prev.filter((el) => el.id !== elementId));
    setSelectedId(null);
  };

  const addElement = (elementType, extra = {}) => {
    const offset = (elements.length % 10) * 20;
    const element = { ...createElement(elementType, newId()), y: 40 + offset, ...extra };
    setElements((prev) => [...prev, element]);
    setSelectedId(element.id);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target.tagName;
      if (event.key === "Delete" && selectedId && !readOnly && !(["INPUT", "TEXTAREA", "SELECT"].includes(tag))) {
        removeElement(selectedId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const handleUseImage = (image) => {
    if (selected?.type === "image") {
      updateElement(selected.id, { pdf_image_id: image.id });
    } else {
      addElement("image", { pdf_image_id: image.id });
    }
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      toast.error("Le nom du modèle est obligatoire");
      return;
    }

    try {
      setSaving(true);
      await api.updateTemplate(id, {
        nom: nom.trim(),
        type,
        format: "A4",
        layout: { format: "A4", elements },
      });
      toast.success("Modèle enregistré");
    } catch (error) {
      const firstError = Object.values(error.response?.data?.errors ?? {})[0]?.[0];
      toast.error(firstError || error.response?.data?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const bytes = await generatePdf({
        layout: { format: "A4", elements },
        data: buildSampleData(),
        values: buildSampleValues(elements),
        images: await fetchImagesForLayout(elements, api),
      });
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch (error) {
      toast.error(error.message || "Aperçu impossible");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <p className={styles.loading}>Chargement du modèle...</p>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <aside className={styles.toolbar}>
          <button type="button" className={styles.secondaryButton} onClick={() => navigate(basePath)}>
            Retour aux modèles
          </button>

          <label className={styles.field}>
            Nom du modèle
            <input className={styles.input} value={nom} maxLength={255} disabled={readOnly} onChange={(e) => setNom(e.target.value)} />
          </label>
          <label className={styles.field}>
            Type
            <select className={styles.input} value={type} disabled={readOnly} onChange={(e) => setType(e.target.value)}>
              <option value="ordonnance">Ordonnance</option>
              <option value="facture">Facture</option>
            </select>
          </label>

          {readOnly ? (
            <p className={styles.hint}>Modèle de l'établissement : consultation uniquement.</p>
          ) : (
            <>
              <h3 className={styles.sectionTitle}>Ajouter un élément</h3>
              {Object.entries(ELEMENT_TYPES).map(([elementType, label]) => (
                <button key={elementType} type="button" className={styles.addButton} onClick={() => addElement(elementType)}>
                  {label}
                </button>
              ))}
            </>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handlePreview}>
              Aperçu PDF
            </button>
            {!readOnly && (
              <button type="button" className={styles.primaryButton} onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            )}
          </div>
        </aside>

        <main className={styles.canvasArea}>
          <div className={styles.pageWrapper}>
            <Stage
              width={pageWidth}
              height={pageHeight}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                <Rect width={pageWidth} height={pageHeight} fill="#ffffff" stroke="#cbd5e1" listening={false} />
                {elements.map((element) => (
                  <CanvasElement
                    key={element.id}
                    element={element}
                    isSelected={element.id === selectedId}
                    readOnly={readOnly}
                    logoUrl={imageUrls[element.pdf_image_id]}
                    onSelect={readOnly ? undefined : () => setSelectedId(element.id)}
                    onChange={(changes) => updateElement(element.id, changes)}
                    registerNode={registerNode}
                  />
                ))}
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  boundBoxFunc={(oldBox, newBox) =>
                    newBox.width < MIN_SIZE || newBox.height < MIN_SIZE ? oldBox : newBox
                  }
                />
              </Layer>
            </Stage>
          </div>
        </main>

        <aside className={styles.sidePanel}>
          {readOnly ? (
            <p className={styles.hint}>Ce modèle est partagé par votre établissement. Vous pouvez le consulter et générer un aperçu.</p>
          ) : (
            <>
              {selected ? (
                <PropertiesPanel
                  element={selected}
                  images={images}
                  onChange={(changes) => updateElement(selected.id, changes)}
                  onDelete={() => removeElement(selected.id)}
                />
              ) : (
                <p className={styles.hint}>Sélectionnez un élément sur le modèle pour le modifier.</p>
              )}

              <PdfImageLibrary
                api={api}
                selectedId={selected?.type === "image" ? selected.pdf_image_id : null}
                onUse={handleUseImage}
                onChange={loadImages}
              />
            </>
          )}
        </aside>
      </div>
    </>
  );
}
