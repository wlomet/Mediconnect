export const telechargerBlob = (blob, nomFichier) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomFichier;
  link.click();
  URL.revokeObjectURL(url);
};

export const telechargerCsv = ({ data, headers }) => {
  const correspondance = /filename="?([^";]+)"?/i.exec(headers["content-disposition"] ?? "");
  telechargerBlob(data, correspondance?.[1] ?? "export.csv");
};
