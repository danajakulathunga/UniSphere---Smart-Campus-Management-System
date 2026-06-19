import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext();

const getInitialTheme = () => {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
    return savedTheme;
  }

  return "system";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    // Force dark mode on landing, auth, and redirect pages
    const isStaticPage = ["/", "/login", "/register", "/oauth-success", "/oauth2/redirect", "/unauthorized"].includes(location.pathname);
    
    if (isStaticPage) {
      root.classList.add("dark");
    } else {
      if (theme === "system") {
        const systemTheme = globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    }

    localStorage.setItem("theme", theme);
  }, [theme, location.pathname]);

  const toggleTheme = () => {
    setTheme((current) => {
      if (current === "system") return "light";
      if (current === "light") return "dark";
      return "system";
    });
  };

  const contextValue = useMemo(
    () => ({
      theme,
      isDarkMode: theme === "dark" || (theme === "system" && globalThis.matchMedia("(prefers-color-scheme: dark)").matches),
      setTheme,
      toggleTheme,
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
