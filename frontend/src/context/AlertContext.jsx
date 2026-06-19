import React, { createContext, useContext, useState, useCallback } from "react";

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    visible: false,
    type: "success", // success, error, warning
    message: "",
    onContinue: null,
  });

  const showAlert = useCallback((type, message, onContinue = null) => {
    setAlert({
      visible: true,
      type,
      message,
      onContinue,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert((prev) => {
      if (prev.onContinue) {
        try {
          prev.onContinue();
        } catch (e) {
          console.error("Error executing alert onContinue callback:", e);
        }
      }
      return { ...prev, visible: false, onContinue: null };
    });
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alert }}>
      {children}
    </AlertContext.Provider>
  );
};
