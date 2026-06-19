import i18n from "../i18n";

/**
 * Formats a date string into "DD MMM YYYY" format
 * Example: "2026-05-06" -> "06 May 2026"
 */
export const formatDate = (dateString, locale) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";

  let currentLang = locale || i18n.language || "en";
  if (currentLang.startsWith("en")) currentLang = "en-US";
  if (currentLang.startsWith("si")) currentLang = "si-LK";
  if (currentLang.startsWith("ta")) currentLang = "ta-LK";

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString(currentLang, { month: "short" });
  const year = date.getFullYear();

  // Avoid trailing dot that some browsers add to abbreviations in some locales
  const cleanMonth = month.endsWith(".") ? month.slice(0, -1) : month;

  return `${day} ${cleanMonth} ${year}`;
};


