import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Moon, ShieldCheck, Sun } from "lucide-react";
import { getAvatarColor } from "../utils/fileUtils";
import { useTranslation } from "react-i18next";

const Header = () => {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = globalThis.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const shouldEnableDark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDarkMode(shouldEnableDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      return;
    }

    root.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, [isDarkMode]);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 transition-colors dark:border-slate-800 dark:bg-slate-900 sm:px-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
          {t("dashboard")}
        </p>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 sm:text-xl">
          {t("hello_user", { name: user.name })}
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setIsDarkMode((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          aria-label={
            isDarkMode ? t("switch_light") : t("switch_dark")
          }
          title={isDarkMode ? t("switch_light") : t("switch_dark")}
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <div className="hidden text-right md:block">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {user.email}
          </div>
          <div className="mt-1 flex flex-wrap justify-end gap-1.5">
            {user.roles.map((role) => (
              <span key={role} className="role-chip">
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getAvatarColor(user.name)} text-white shadow-md shadow-teal-900/20`}>
          {user.name.charAt(0).toUpperCase()}
        </div>

        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:flex">
          <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          {t("verified_session")}
        </div>
      </div>
    </header>
  );
};

export default Header;
