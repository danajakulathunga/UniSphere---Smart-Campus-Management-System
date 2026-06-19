import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  decodeJwtPayload,
  getLandingRoute,
  normalizeRoles,
  useAuth,
} from "../context/AuthContext";

const OAuthSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (!token) {
      navigate(
        `/login?error=${encodeURIComponent(error || "OAuth2 authentication failed")}`,
        {
          replace: true,
        },
      );
      return;
    }

    loginUser(token, null);
    const payload = decodeJwtPayload(token);
    navigate(getLandingRoute(normalizeRoles(payload?.roles)), {
      replace: true,
    });
  }, [location.search, loginUser, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-slate-900 text-white">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white" />
      <p>Signing you in...</p>
    </div>
  );
};

export default OAuthSuccess;
