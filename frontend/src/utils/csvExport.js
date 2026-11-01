export const telechargerCsv = ({ data, headers }) => {
  const correspondance = /filename="?([^";]+)"?/i.exec(headers["content-disposition"] ?? "");
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = correspondance?.[1] ?? "export.csv";
  link.click();
  URL.revokeObjectURL(url);
};
