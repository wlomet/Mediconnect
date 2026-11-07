import { downloadBlob } from "./pdf/downloadBlob";

const RESOLUTION = 2;
const HAUTEUR_ENTETE = 72;

const chargerImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Rendu du graphique impossible"));
    image.src = source;
  });

// Le SVG doit porter ses styles en attributs (les feuilles CSS ne suivent pas dans l'image)
export const exporterSvgEnPng = async ({ svg, titre, sousTitre, nomFichier }) => {
  const { width, height } = svg.viewBox.baseVal;

  const copie = svg.cloneNode(true);
  copie.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copie.setAttribute("width", width * RESOLUTION);
  copie.setAttribute("height", height * RESOLUTION);

  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copie))}`;
  const image = await chargerImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = width * RESOLUTION;
  canvas.height = (height + HAUTEUR_ENTETE) * RESOLUTION;

  const ctx = canvas.getContext("2d");
  ctx.scale(RESOLUTION, RESOLUTION);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height + HAUTEUR_ENTETE);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 22px Arial, Helvetica, sans-serif";
  ctx.fillText(titre, 24, 34);

  ctx.fillStyle = "#6b7280";
  ctx.font = "15px Arial, Helvetica, sans-serif";
  ctx.fillText(sousTitre, 24, 58);

  ctx.drawImage(image, 0, HAUTEUR_ENTETE, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  downloadBlob(blob, `${nomFichier}.png`);
};
