import React, {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
} from "react";
import api from "../services/api";
import { useQueryClient } from "@tanstack/react-query";

const AuthContext = createContext();

export const normalizeRole = (role) => {
  if (!role) return "USER";

  const rawRole =
    typeof role === "string"
      ? role
      : role?.authority || role?.name || role?.role || "USER";

  const trimmedRole = String(rawRole)
    .trim()
    .replace(/^['\"]|['\"]$/g, "");
  const unprefixedRole = trimmedRole.startsWith("ROLE_")
    ? trimmedRole.slice(5)
    : trimmedRole;

  return unprefixedRole.toUpperCase() || "USER";
};

const collectRoleValues = (value, collected = []) => {
  if (!value) return collected;

  if (Array.isArray(value)) {
    value.forEach((item) => collectRoleValues(item, collected));
    return collected;
  }

  if (typeof value === "string") {
    collected.push(value);
    return collected;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectRoleValues(item, collected));
  }

  return collected;
};

export const normalizeRoles = (roles) => {
  if (!roles) {
    return ["USER"];
  }

  let roleList = Array.isArray(roles) ? roles : [roles];

  if (!Array.isArray(roles) && typeof roles === "string") {
    const trimmed = roles.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        roleList = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        roleList = trimmed.split(/[\s,]+/).filter(Boolean);
      }
    } else {
      roleList = trimmed.split(/[\s,]+/).filter(Boolean);
    }
  }

  if (roleList.length === 0) {
    return ["USER"];
  }

  const normalized = roleList
    .map(normalizeRole)
    .filter(Boolean)
    .filter((role) => role !== "NULL" && role !== "UNDEFINED");

  if (normalized.length === 0) {
    return ["USER"];
  }

  return [...new Set(normalized)];
};

const extractRolesFromClaims = (decoded = {}) => {
  const directClaimRoles = decoded.roles || decoded.role || decoded.authorities;
  const collectedValues = collectRoleValues(directClaimRoles);
  const normalized = normalizeRoles(
    collectedValues.length > 0 ? collectedValues : collectRoleValues(decoded),
  );

  return normalized;
};

export const decodeJwtPayload = (token) => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const decoded = JSON.parse(globalThis.atob(paddedBase64));

    return {
      id: decoded.id || "",
      email: decoded.sub || "",
      name: decoded.name || (decoded.sub ? decoded.sub.split("@")[0] : "User"),
      roles: extractRolesFromClaims(decoded),
      provider: "LOCAL",
    };
  } catch {
    return null;
  }
};

export const getRoleFromToken = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return "USER";

  const normalizedRoles = normalizeRoles(payload.roles);
  if (normalizedRoles.includes("ADMIN")) {
    return "ADMIN";
  }

  if (normalizedRoles.includes("TECHNICIAN")) {
    return "TECHNICIAN";
  }

  if (normalizedRoles.includes("LECTURER")) {
    return "LECTURER";
  }

  const email = String(payload.email || "").toLowerCase();
  if (email.startsWith("admin")) return "ADMIN";
  if (email.startsWith("tech")) return "TECHNICIAN";
  if (email.startsWith("lec")) return "LECTURER";

  return "USER";
};

export const getLandingRouteFromToken = (token) => {
  return getLandingRoute([getRoleFromToken(token)]);
};

export const getLandingRoute = (roles = []) => {
  const normalizedRoles = normalizeRoles(roles);

  if (normalizedRoles.includes("ADMIN")) {
    return "/admin-dashboard";
  }

  if (normalizedRoles.includes("TECHNICIAN")) {
    return "/technician-dashboard";
  }

  if (normalizedRoles.includes("LECTURER")) {
    return "/lecturer-dashboard";
  }

  return "/user-dashboard";
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      // To strictly respect current settings even for old unread notifications in the badge,
      // we fetch the unread list and filter it on the frontend.
      const res = await api.get("/notifications", { 
        params: { page: 0, size: 50 } 
      });
      const data = res.data?.content || [];
      console.log("Fetched notifications:", data);
      const unreadItems = data.filter(n => n.status === 'UNREAD' || n.read === false);
      
      if (!user?.notificationSettings) {
        setUnreadCount(unreadItems.length);
        return;
      }

      const settings = user.notificationSettings;
      const filteredUnread = unreadItems.filter(n => {
        if (settings.all) return true;
        const type = n.type || "";
        const isBooking = type.startsWith("BOOKING");
        const isTicket = type.startsWith("TICKET");
        const isLecture = type.startsWith("LECTURE");
        const isSystem = type === "USER_REGISTERED" ||
                         type === "ANNOUNCEMENT_PUBLISHED" ||
                         type === "STUDENT_BATCH_MATCH" ||
                         type === "ATTENDANCE_SUBMITTED";

        if (isBooking) return settings.booking;
        if (isTicket) return settings.ticket;
        if (isLecture) return settings.lecture;
        if (isSystem) return true;
        return false; // Block others if All is OFF
      });

      setUnreadCount(filteredUnread.length);
    } catch (error) {
      console.error("Failed to load unread count", error);
    }
  }, [token, user?.notificationSettings]);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Keep dashboard responsive when we already have user info.
      const shouldBlockUI = !user;
      if (shouldBlockUI) {
        setLoading(true);
      }

      const tokenUser = decodeJwtPayload(token);
      if (tokenUser && !user) {
        setUser(tokenUser);
      }

      try {
        // If token exists, fetch user details
        const res = await api.get("/users/me");
        const apiRoles = normalizeRoles(res.data?.roles);
        const tokenRoles = normalizeRoles(tokenUser?.roles);
        const effectiveRoles =
          apiRoles.includes("ADMIN") || apiRoles.includes("TECHNICIAN")
            ? apiRoles
            : tokenRoles;

        setUser({
          ...res.data,
          roles: effectiveRoles,
        });
      } catch (error) {
        console.error("Failed to load user", error);

        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          logout();
        } else if (!user) {
          // Fallback to JWT claims to keep navigation fast even when user API is temporarily unavailable.
          const fallbackUser = tokenUser || decodeJwtPayload(token);
          if (fallbackUser) {
            setUser(fallbackUser);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshUnreadCount();
      // Poll for notifications every 2 seconds for instant updates
      const interval = setInterval(refreshUnreadCount, 2000);
      return () => clearInterval(interval);
    }
  }, [token, refreshUnreadCount]);

  const loginUser = useCallback((newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);

    if (userData) {
      setUser({
        ...userData,
        roles: normalizeRoles(userData.roles),
      });
      return;
    }

    const fallbackUser = decodeJwtPayload(newToken);
    if (fallbackUser) {
      setUser(fallbackUser);
    }
  }, []);

  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    // Clear all cached data on logout for security and to prevent 401 loops
    queryClient.clear();
  }, [queryClient]);

  const updateUser = useCallback((updatedData) => {
    setUser((prev) => ({
      ...prev,
      ...updatedData,
    }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loginUser,
        logout,
        loading,
        unreadCount,
        refreshUnreadCount,
        updateUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
