import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  decodeJwtPayload,
  getLandingRoute,
  normalizeRoles,
  useAuth,
} from "../context/AuthContext";

const OAuth2RedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (token) {
      loginUser(token, null);
      const payload = decodeJwtPayload(token);
      navigate(getLandingRoute(normalizeRoles(payload?.roles)), {
        replace: true,
      });
    } else {
      navigate("/login?error=" + (error || "OAuth2 authentication failed"), {
        replace: true,
      });
    }
  }, [location, navigate, loginUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white flex-col space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      <p>Processing Authentication...</p>
    </div>
  );
};

export default OAuth2RedirectHandler;
