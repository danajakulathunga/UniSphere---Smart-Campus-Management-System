import { BASE_URL } from "../services/api";

export const getAssetUrl = (url) => {
  if (!url) return null;
  
  // If it's a Base64 string, return it as is
  if (url.startsWith("data:")) return url;
  
  // If it's already a full URL (http or https), return it as is
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  
  // If it's a relative path starting with /uploads, prefix with BASE_URL
  if (url.startsWith("/uploads")) {
    return `${BASE_URL}${url}`;
  }
  
  return url;
};

export const getAvatarColor = (name) => {
  if (!name) return "bg-slate-500";
  const firstLetter = name.trim().charAt(0).toUpperCase();
  const index = firstLetter.charCodeAt(0) - 65; // A=0, B=1, ... Z=25

  const colors = [
    "bg-red-500",      // A
    "bg-blue-500",     // B
    "bg-green-500",    // C
    "bg-yellow-500",   // D
    "bg-purple-500",   // E
    "bg-pink-500",     // F
    "bg-indigo-500",   // G
    "bg-orange-500",   // H
    "bg-teal-500",     // I
    "bg-cyan-500",     // J
    "bg-lime-500",     // K
    "bg-emerald-500",  // L
    "bg-rose-500",     // M
    "bg-sky-500",      // N
    "bg-violet-500",   // O
    "bg-fuchsia-500",  // P
    "bg-amber-500",    // Q
    "bg-slate-500",    // R
    "bg-red-700",      // S
    "bg-blue-700",     // T
    "bg-green-700",    // U
    "bg-purple-700",   // V
    "bg-pink-700",     // W
    "bg-indigo-700",   // X
    "bg-orange-700",   // Y
    "bg-teal-700",     // Z
  ];

  if (index >= 0 && index < 26) {
    return colors[index];
  }
  return "bg-slate-500"; // Fallback for non-alpha or empty strings
};
