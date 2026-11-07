import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { telechargerBlob } from "./csvExport";

export const FORMATS_EXPORT = [
  { valeur: "csv", libelle: "CSV" },
  { valeur: "xlsx", libelle: "Excel" },
  { valeur: "pdf", libelle: "PDF" },
];

const TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const TYPE_PDF = "application/pdf";

const PAGE = { largeur: 842, hauteur: 595 }; // A4 paysage
const MARGE = 36;
const TAILLE_TEXTE = 8;
const TAILLE_TITRE = 14;
const INTERLIGNE = 10;
const PADDING = 4;
const LARGEUR_MAX_COLONNE = 200;
const COULEUR_TEXTE = rgb(0.1, 0.12, 0.18);
const COULEUR_ENTETE = rgb(0.93, 0.95, 0.98);
const COULEUR_SEPARATEUR = rgb(0.8, 0.8, 0.8);
const COULEUR_DISCRETE = rgb(0.45, 0.45, 0.45);

// Excel : 31 caractères maximum, sans \ / ? * [ ] :
const nomFeuille = (titre) => titre.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

const genererXlsx = async ({ titre, entetes, lignes }) => {
  const { default: ExcelJS } = await import("exceljs");
  const classeur = new ExcelJS.Workbook();
  const feuille = classeur.addWorksheet(nomFeuille(titre));

  feuille.addRow(entetes);
  feuille.getRow(1).font = { bold: true };
  lignes.forEach((ligne) => feuille.addRow(ligne));
  feuille.views = [{ state: "frozen", ySplit: 1 }];
  feuille.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lignes.length + 1, column: entetes.length },
  };

  entetes.forEach((entete, index) => {
    const longueurMax = lignes.reduce(
      (max, ligne) => Math.max(max, String(ligne[index] ?? "").length),
      entete.length
    );
    feuille.getColumn(index + 1).width = Math.min(Math.max(longueurMax + 2, 8), 60);
  });

  const contenu = await classeur.xlsx.writeBuffer();
  return new Blob([contenu], { type: TYPE_XLSX });
};

// Polices standard PDF : seuls les caractères WinAnsi sont encodables
const nettoyer = (valeur) =>
  String(valeur ?? "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF\u20AC\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/g, "?")
    .trim();

const decouperTexte = (texte, fonte, taille, largeurMax) => {
  const largeur = (morceau) => fonte.widthOfTextAtSize(morceau, taille);
  const lignes = [];
  let courante = "";

  texte.split(" ").forEach((mot) => {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (largeur(essai) <= largeurMax) {
      courante = essai;
      return;
    }

    if (courante) lignes.push(courante);
    courante = "";
    // Mot plus large que la colonne : découpé caractère par caractère
    for (const caractere of mot) {
      if (courante && largeur(courante + caractere) > largeurMax) {
        lignes.push(courante);
        courante = "";
      }
      courante += caractere;
    }
  });

  lignes.push(courante);
  return lignes;
};

const calculerLargeurs = (titres, valeurs, police, policeGras, largeurUtile) => {
  const naturelles = titres.map((titre, index) => {
    const largeurContenu = valeurs.reduce(
      (max, ligne) => Math.max(max, police.widthOfTextAtSize(ligne[index], TAILLE_TEXTE)),
      policeGras.widthOfTextAtSize(titre, TAILLE_TEXTE)
    );
    return Math.min(largeurContenu, LARGEUR_MAX_COLONNE) + 2 * PADDING;
  });
  const total = naturelles.reduce((somme, largeur) => somme + largeur, 0);

  return naturelles.map((largeur) => (largeur * largeurUtile) / total);
};

const genererPdf = async ({ titre, entetes, lignes }) => {
  const pdf = await PDFDocument.create();
  const police = await pdf.embedFont(StandardFonts.Helvetica);
  const policeGras = await pdf.embedFont(StandardFonts.HelveticaBold);

  const titres = entetes.map(nettoyer);
  const valeurs = lignes.map((ligne) => entetes.map((_, index) => nettoyer(ligne[index])));
  const largeurUtile = PAGE.largeur - 2 * MARGE;
  const largeurs = calculerLargeurs(titres, valeurs, police, policeGras, largeurUtile);

  let x = MARGE;
  const colonnesX = largeurs.map((largeur) => {
    const position = x;
    x += largeur;
    return position;
  });

  const preparer = (cellules, fonte) => {
    const blocs = cellules.map((texte, index) =>
      decouperTexte(texte, fonte, TAILLE_TEXTE, largeurs[index] - 2 * PADDING)
    );
    const hauteur = Math.max(...blocs.map((bloc) => bloc.length)) * INTERLIGNE + 2 * PADDING;
    return { blocs, hauteur, fonte };
  };

  const enteteLigne = preparer(titres, policeGras);
  let page;
  let y;

  const dessinerLigne = ({ blocs, hauteur, fonte }, estEntete) => {
    if (estEntete) {
      page.drawRectangle({
        x: MARGE,
        y: y - hauteur,
        width: largeurUtile,
        height: hauteur,
        color: COULEUR_ENTETE,
      });
    }

    blocs.forEach((bloc, index) => {
      bloc.forEach((morceau, numero) => {
        page.drawText(morceau, {
          x: colonnesX[index] + PADDING,
          y: y - PADDING - TAILLE_TEXTE - numero * INTERLIGNE,
          size: TAILLE_TEXTE,
          font: fonte,
          color: COULEUR_TEXTE,
        });
      });
    });

    page.drawLine({
      start: { x: MARGE, y: y - hauteur },
      end: { x: MARGE + largeurUtile, y: y - hauteur },
      thickness: 0.5,
      color: COULEUR_SEPARATEUR,
    });
    y -= hauteur;
  };

  const nouvellePage = () => {
    page = pdf.addPage([PAGE.largeur, PAGE.hauteur]);
    y = PAGE.hauteur - MARGE;
    if (pdf.getPageCount() === 1) {
      page.drawText(nettoyer(titre), {
        x: MARGE,
        y: y - TAILLE_TITRE,
        size: TAILLE_TITRE,
        font: policeGras,
        color: COULEUR_TEXTE,
      });
      y -= TAILLE_TITRE + 2 * INTERLIGNE;
    }
    dessinerLigne(enteteLigne, true);
  };

  nouvellePage();
  valeurs.forEach((cellules) => {
    const ligne = preparer(cellules, police);
    if (y - ligne.hauteur < MARGE) nouvellePage();
    dessinerLigne(ligne, false);
  });

  const pages = pdf.getPages();
  pages.forEach((courante, index) => {
    courante.drawText(`Page ${index + 1} / ${pages.length}`, {
      x: PAGE.largeur - MARGE - 50,
      y: MARGE / 2,
      size: TAILLE_TEXTE,
      font: police,
      color: COULEUR_DISCRETE,
    });
  });

  return new Blob([await pdf.save()], { type: TYPE_PDF });
};

const GENERATEURS = { xlsx: genererXlsx, pdf: genererPdf };

// Excel et PDF sont générés dans le navigateur à partir des lignes renvoyées par le backend (format=json)
export const telechargerTableau = async ({ format, nomBase, titre, entetes, lignes }) => {
  const blob = await GENERATEURS[format]({ titre, entetes, lignes });
  telechargerBlob(blob, `${nomBase}.${format}`);
};
