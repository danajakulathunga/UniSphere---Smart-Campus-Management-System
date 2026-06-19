import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  User as UserIcon,
  Bell,
  Search,
  Loader2,
  Package,
  Ticket,
  Calendar as CalendarIcon,
  ChevronRight as ChevronIcon,
  GraduationCap,
  Megaphone,
  BookOpen,
} from "lucide-react";
import { useAuth, normalizeRoles } from "../context/AuthContext";
import { useSearch } from "../context/SearchContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { getAssetUrl, getAvatarColor } from "../utils/fileUtils";
import { useTranslation } from "react-i18next";

const parseNoticeDate = (val) => {
  if (!val) return new Date(0);
  if (Array.isArray(val)) {
    const [y, m, d, h = 0, min = 0, s = 0] = val;
    return new Date(y, m - 1, d, h, min, s);
  }
  if (typeof val !== "string") return new Date(val);
  try {
    const parts = val.split(/[T\-:\.Z]/);
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1; // 0-indexed month
      const d = parseInt(parts[2], 10);
      const h = parts[3] ? parseInt(parts[3], 10) : 0;
      const min = parts[4] ? parseInt(parts[4], 10) : 0;
      const s = parts[5] ? parseInt(parts[5], 10) : 0;
      return new Date(y, m, d, h, min, s);
    }
  } catch (e) {
    console.error(e);
  }
  return new Date(val);
};

const Sidebar = ({
  items,
  activeKey,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  user,
  displayRole,
  accentClassName = "bg-blue-600",
  accentButtonClassName = "bg-blue-600",
  accentTextClassName = "text-blue-400",
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileContainerRef = useRef(null);
  const { unreadCount } = useAuth();
  const derivedRole = user?.roles?.[0] || "USER";
  
  const getLocalizedRoleText = () => {
    if (!user) return "";
    
    const facultyMap = {
      "faculty of computing": "faculty_computing",
      "faculty of business": "faculty_business",
      "faculty of engineering": "faculty_engineering",
      "faculty of science": "faculty_science",
      "faculty of humanities": "faculty_humanities",
      "faculty of humanities & sciences": "faculty_humanities_sciences",
      "faculty of information science": "faculty_information_science",
      "computing": "faculty_computing",
      "engineering": "faculty_engineering",
      "business": "faculty_business",
      "science": "faculty_science",
      "humanities": "faculty_humanities",
      "information science": "faculty_information_science",
    };

    const designationMap = {
      "lecturer": "designation_lecturer",
      "senior lecturer": "designation_senior_lecturer",
      "professor": "designation_professor",
    };

    const techCategoryMap = {
      "it technician": "tech_category_it",
      "electrical technician": "tech_category_electrical",
      "mechanical technician": "tech_category_mechanical",
      "maintenance technician": "tech_category_maintenance",
      "technician": "technician",
    };

    const getLocalizedFacultyName = (fac) => {
      if (!fac) return "";
      const cleanFac = fac.replace(/Faculty of /i, "").trim().toLowerCase();
      const key = facultyMap[cleanFac];
      if (key) {
        const translated = t(key);
        return translated
          .replace(/Faculty of /i, "")
          .replace(/පීඨය/g, "")
          .replace(/பீடம்/g, "")
          .trim();
      }
      return fac.replace(/Faculty of /i, "").trim();
    };

    if (derivedRole === "ADMIN") {
      return t("system_admin", { defaultValue: "System Admin" }).toUpperCase();
    }

    if (derivedRole === "TECHNICIAN") {
      const spec = user.specialization || "Technician";
      const key = techCategoryMap[spec.toLowerCase().trim()];
      return (key ? t(key) : spec).toUpperCase();
    }

    if (derivedRole === "LECTURER") {
      const des = user.designation || "Lecturer";
      const desKey = designationMap[des.toLowerCase().trim()];
      const localizedDes = desKey ? t(desKey) : des;
      
      if (user.faculty) {
        const localizedFac = getLocalizedFacultyName(user.faculty);
        return `${localizedDes} / ${localizedFac}`.toUpperCase();
      }
      return localizedDes.toUpperCase();
    }

    // Default student role
    const studentLabel = t("student", { defaultValue: "Student" });
    if (user.faculty) {
      const localizedFac = getLocalizedFacultyName(user.faculty);
      return `${studentLabel} / ${localizedFac}`.toUpperCase();
    }
    return studentLabel.toUpperCase();
  };

  const {
    searchQuery,
    setSearchQuery,
    globalResults,
    performGlobalSearch,
    isSearching,
  } = useSearch();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);
  const queryClient = useQueryClient();

  // Fetch announcements for the unread badge
  const { data: announcements = [] } = useQuery({
    queryKey: ["sidebar-announcements"],
    queryFn: async () => {
      const res = await api.get("/announcements");
      return res.data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Track and clear unread announcements count
  useEffect(() => {
    if (location.pathname === "/announcements" && user?.id) {
      localStorage.setItem(
        `lastReadAnnouncements_${user.id}`,
        new Date().toISOString(),
      );
      queryClient.invalidateQueries({ queryKey: ["sidebar-announcements"] });
    }
    return () => {
      if (location.pathname === "/announcements" && user?.id) {
        localStorage.setItem(
          `lastReadAnnouncements_${user.id}`,
          new Date().toISOString(),
        );
      }
    };
  }, [location.pathname, user?.id, queryClient]);

  const unreadAnnouncementsCount = useMemo(() => {
    if (location.pathname === "/announcements") return 0;
    if (!announcements || !user) return 0;

    return announcements.filter((notice) => {
      // 1. Check if user is in recipients list and isRead is false
      if (notice.recipients && notice.recipients.length > 0) {
        const recipientRecord = notice.recipients.find(
          (r) => r.userId === user.id,
        );
        return recipientRecord && !recipientRecord.read;
      }

      // 2. Fallback to role-based logic for legacy announcements (if recipients list is empty)
      const lastReadStr = localStorage.getItem(
        `lastReadAnnouncements_${user.id}`,
      );
      const lastReadTime = lastReadStr ? new Date(lastReadStr) : new Date(0);
      const createdAt = parseNoticeDate(notice.createdAt);
      if (createdAt <= lastReadTime) return false;

      const posterRole = (notice.postedByRole || "")
        .replace("ROLE_", "")
        .toUpperCase();
      const userRoles = normalizeRoles(user?.roles);
      const isUserAdmin = userRoles.includes("ADMIN");
      const isUserLecturer = userRoles.includes("LECTURER");

      if (posterRole === "ADMIN") {
        return !isUserAdmin;
      }

      if (posterRole === "LECTURER") {
        return !isUserLecturer;
      }

      return false;
    }).length;
  }, [announcements, user, location.pathname]);

  const isAdmin = derivedRole === "ADMIN";
  const isTechnician = derivedRole === "TECHNICIAN";

  useEffect(() => {
    if (!activeKey) return;

    const timer = setTimeout(() => {
      handlePrefetch(activeKey);
    }, 100);

    return () => clearTimeout(timer);
  }, [activeKey]);

  const handlePrefetch = (key) => {
    switch (key) {
      case "resources":
        queryClient.prefetchQuery({
          queryKey: [
            "resources",
            0,
            { type: "", capacity: "", status: "" },
            searchQuery || "",
          ],
          queryFn: async () => {
            const res = await api.get("/resources", {
              params: { page: 0, size: 9 },
            });
            return res.data;
          },
        });
        break;
      case "bookings":
        queryClient.prefetchQuery({
          queryKey: ["bookings", isAdmin, "", "", searchQuery || ""],
          queryFn: async () => {
            const endpoint = isAdmin ? "/bookings" : "/bookings/mine";
            const res = await api.get(endpoint, {
              params: { page: 0, size: 10 },
            });
            return Array.isArray(res.data?.content)
              ? res.data.content
              : Array.isArray(res.data)
                ? res.data
                : [];
          },
        });
        queryClient.prefetchQuery({
          queryKey: ["bookings-summary"],
          queryFn: async () => (await api.get("/bookings/summary")).data,
        });
        break;
      case "tickets":
        queryClient.prefetchQuery({
          queryKey: [
            "tickets",
            isAdmin,
            isTechnician,
            "",
            "",
            "",
            searchQuery || "",
            0,
          ],
          queryFn: async () => {
            let endpoint = "/tickets/mine";
            if (isAdmin) endpoint = "/tickets";
            if (isTechnician) endpoint = "/tickets/assigned";
            const res = await api.get(endpoint, {
              params: { page: 0, size: 12 },
            });
            return res.data;
          },
        });
        queryClient.prefetchQuery({
          queryKey: ["tickets-summary"],
          queryFn: async () => (await api.get("/tickets/summary")).data,
        });
        queryClient.prefetchQuery({
          queryKey: ["technicians"],
          queryFn: async () => (await api.get("/users/technicians")).data,
        });
        break;
      case "dashboard":
        if (isAdmin) {
          queryClient.prefetchQuery({
            queryKey: ["admin-recent-bookings", searchQuery || ""],
            queryFn: async () => {
              const res = await api.get("/bookings", {
                params: { page: 0, size: 5 },
              });
              return res.data?.content || [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ["admin-users-count"],
            queryFn: () =>
              api.get("/admin/users", { params: { page: 0, size: 1 } }),
          });
          queryClient.prefetchQuery({
            queryKey: ["admin-resources-all"],
            queryFn: async () => {
              const res = await api.get("/resources", {
                params: { page: 0, size: 100 },
              });
              return res.data?.content || [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ["admin-tickets-count"],
            queryFn: () =>
              api.get("/tickets", { params: { page: 0, size: 1 } }),
          });
          queryClient.prefetchQuery({
            queryKey: ["admin-tickets-summary"],
            queryFn: async () => (await api.get("/tickets/summary")).data,
          });
          queryClient.prefetchQuery({
            queryKey: ["admin-bookings-summary"],
            queryFn: async () => (await api.get("/bookings/summary")).data,
          });
        } else if (isTechnician) {
          queryClient.prefetchQuery({
            queryKey: ["technician-summary"],
            queryFn: async () => (await api.get("/tickets/summary")).data,
          });
          queryClient.prefetchQuery({
            queryKey: ["technician-active-queue", searchQuery || ""],
            queryFn: async () => {
              const res = await api.get("/tickets/assigned", {
                params: { page: 0, size: 5 },
              });
              return res.data?.content || [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ["technician-resource-health"],
            queryFn: async () => {
              const res = await api.get("/resources", {
                params: { page: 0, size: 50 },
              });
              return res.data?.content || [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ["technician-resolution-history"],
            queryFn: async () => {
              const res = await api.get("/tickets/assigned", {
                params: { page: 0, size: 50, status: "RESOLVED" },
              });
              return res.data?.content || [];
            },
          });
        } else {
          queryClient.prefetchQuery({
            queryKey: ["user-upcoming-bookings"],
            queryFn: async () => {
              const res = await api.get("/bookings/mine", {
                params: { page: 0, size: 5 },
              });
              return res.data?.content || [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ["user-bookings-summary", searchQuery || ""],
            queryFn: async () => {
              const res = await api.get("/bookings/mine", {
                params: { page: 0, size: 5 },
              });
              return res.data?.content || [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ["user-tickets-summary"],
            queryFn: async () => (await api.get("/tickets/summary")).data,
          });
          queryClient.prefetchQuery({
            queryKey: ["all-resources-status"],
            queryFn: async () => {
              const res = await api.get("/resources", {
                params: { page: 0, size: 100 },
              });
              return res.data?.content || [];
            },
          });
        }
        break;
      case "notifications":
        queryClient.prefetchQuery({
          queryKey: ["notifications"],
          queryFn: async () => {
            const res = await api.get("/notifications", {
              params: { page: 0, size: 100 },
            });
            return res.data?.content || [];
          },
        });
        break;
      case "users":
        queryClient.prefetchQuery({
          queryKey: ["users", "", searchQuery || "", "ALL", 0],
          queryFn: async () => {
            const res = await api.get("/admin/users", {
              params: { page: 0, size: 10 },
            });
            return res.data?.content || [];
          },
        });
        break;
      default:
        break;
    }
  };

  // Sync local search with global search
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setShowDropdown(false);
  }, [location.pathname]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    setShowDropdown(value.length > 0);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setSearchQuery(value);
      performGlobalSearch(value);
    }, 300);
  };

  const handleResultClick = (result) => {
    navigate(`${result.path}?highlight=${result.id}`);
    setShowDropdown(false);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Resource":
        return <Package className="h-4 w-4" />;
      case "Ticket":
        return <Ticket className="h-4 w-4" />;
      case "Booking":
        return <CalendarIcon className="h-4 w-4" />;
      case "Lecture":
        return <BookOpen className="h-4 w-4" />;
      case "Notification":
        return <Bell className="h-4 w-4" />;
      case "Announcement":
        return <Megaphone className="h-4 w-4" />;
      case "User":
      case "Student":
      case "Staff":
        return <UserIcon className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!profileContainerRef.current?.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    // Mobile Sidebar Scroll Lock
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    };
  }, [isProfileOpen, isMobileOpen]);

  // Rich Gradient matching Landing Page & Dark Mode
  // Rich Gradient matching Landing Page & Dark Mode
  const sidebarGradient =
    "bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#2e1065]";

  // Filter out settings from main items if we're moving it to profile dropdown
  const filteredItems = items.filter((item) => item.key !== "settings");

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[1050] bg-slate-900/60 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed left-4 top-4 bottom-4 z-[1100] ${sidebarGradient} text-white shadow-2xl lg:fixed rounded-xl border border-white/10 flex flex-col whitespace-nowrap ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "sidebar-collapsed" : ""}`}
        style={{
          width: isCollapsed ? "112px" : "288px",
          transition: "width 0.3s ease",
          willChange: "width",
        }}
      >
        {/* Brand Section */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-white/10 transition-all duration-300 ${isCollapsed ? "justify-center" : "px-5"}`}
        >
          <div
            className={`flex items-center overflow-hidden transition-all duration-300 ${isCollapsed ? "gap-0" : "gap-3"}`}
          >
            <div
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition-transform duration-500 hover:scale-105`}
            >
              <GraduationCap className="h-5 w-5" />
            </div>
            <div
              className={`transition-all duration-300 ease-in-out flex flex-col ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}
            >
              <p className="text-sm font-black text-white tracking-tighter uppercase leading-none">
                UniSphere
              </p>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mt-0.5">
                Operations
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div
          className="h-[56px] shrink-0 px-3 pt-3 pb-1 relative"
          ref={dropdownRef}
        >
          <div
            className={`transition-opacity duration-200 ease-in-out delay-100 ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <div className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60 group-focus-within:text-blue-400 transition-colors duration-300" />
              <input
                type="text"
                placeholder={t("search")}
                className="h-8 w-full pl-8 pr-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 transition-all duration-300 hover:bg-white/10 focus:bg-white/15 focus:border-blue-500/50 outline-none shadow-inner"
                value={localSearch}
                onChange={handleSearchChange}
                onFocus={() => localSearch.length > 0 && setShowDropdown(true)}
              />

              {/* Search Dropdown Results */}
              {showDropdown && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-xl border border-white/10 bg-indigo-950 shadow-2xl shadow-black/40 overflow-hidden z-[2000] animate-reveal w-72 backdrop-blur-xl">
                  <div className="p-2 space-y-1 max-h-[420px] overflow-y-auto scrollbar-hide">
                    {isSearching ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                          Searching...
                        </span>
                      </div>
                    ) : globalResults.length > 0 ? (
                      <>
                        {[
                          "Resource",
                          "Ticket",
                          "Booking",
                          "Lecture",
                          "Student",
                          "Staff",
                          "Notification",
                          "Announcement",
                        ].map((type) => {
                          const typeResults = globalResults.filter(
                            (r) => r.type === type,
                          );
                          if (typeResults.length === 0) return null;
                          return (
                            <div key={type} className="mb-2 last:mb-0">
                              <div className="px-3 py-1.5 flex items-center gap-2 border-b border-white/5 bg-white/5">
                                <div className="h-1 w-1 rounded-full bg-blue-400" />
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                                  {t(type.toLowerCase() + "s")}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {typeResults.map((result) => (
                                  <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleResultClick(result)}
                                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-all group/item text-left border-b border-white/5 last:border-0"
                                  >
                                    <div className="h-7 w-7 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover/item:text-white transition-all">
                                      {getTypeIcon(result.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-white/80 group-hover/item:text-white transition-colors truncate">
                                        {result.title}
                                      </div>
                                    </div>
                                    <ChevronIcon className="h-3 w-3 text-white/20 opacity-0 -translate-x-1 transition-all group-hover/item:opacity-100 group-hover/item:translate-x-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-xs font-bold text-white/60">
                          No results found
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-3 relative overflow-y-auto scrollbar-hide">
          <div className="space-y-4">
            {[
              {
                id: "overview",
                title: "OVERVIEW",
                shortTitle: "OVERVIEW",
                keys: ["dashboard"],
              },
              {
                id: "resources",
                title: "CAMPUS RESOURCES",
                shortTitle: "RESOURCES",
                keys: ["resources", "bookings", "my-lectures"],
              },
              {
                id: "identity",
                title: "IDENTITY & ACCESS",
                shortTitle: "ACCESS",
                keys: ["users", "staff", "students"],
              },
              {
                id: "operations",
                title: "OPERATIONS",
                shortTitle: "OPERATIONS",
                keys: ["tickets", "announcements", "notifications"],
              },
            ].map((section, sIndex) => {
              const sectionItems = filteredItems.filter((item) =>
                section.keys.includes(item.key),
              );
              if (sectionItems.length === 0) return null;

              return (
                <div key={section.id} className="space-y-1">
                  <div className="relative h-4 mb-1 w-full overflow-hidden">
                    <p
                      className={`absolute left-3 whitespace-nowrap text-[9px] font-black text-white/40 uppercase tracking-widest transition-opacity duration-200 ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100 delay-100"}`}
                    >
                      {t(section.id)}
                    </p>
                    <p
                      className={`absolute left-0 right-0 px-1 overflow-hidden text-ellipsis text-center whitespace-nowrap text-[9px] font-black text-white/40 uppercase tracking-widest transition-opacity duration-200 ${isCollapsed ? "opacity-100 delay-100" : "opacity-0 pointer-events-none"}`}
                    >
                      {t(section.id + "_short")}
                    </p>
                  </div>
                  <div className="space-y-1 relative">
                    {sectionItems.map((item) => {
                      const isActive = item.key === activeKey;
                      const Icon = item.icon;

                      return (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => onNavigate(item)}
                          onMouseEnter={() => handlePrefetch(item.key)}
                          onFocus={() => handlePrefetch(item.key)}
                          className={`group relative flex w-full h-10 items-center rounded-lg px-3 text-xs font-bold transition-all duration-300 outline-none focus:outline-none z-10 ${
                            isActive
                              ? "text-white"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          {/* Active Background (Pill) - Integrated into button to handle section breaks */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-lg bg-white/15 backdrop-blur-md border border-white/10 shadow-lg animate-in fade-in zoom-in-95 duration-300">
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-white"></div>
                            </div>
                          )}

                          <div
                            className={`relative flex items-center w-full ${isCollapsed ? "justify-center" : ""}`}
                          >
                            <div
                              className={`relative flex items-center justify-center shrink-0 transition-all duration-300 ${!isCollapsed ? "w-5 mr-3" : "w-5"}`}
                            >
                              <Icon
                                className={`h-4.5 w-4.5 transition-all duration-300 ${
                                  isActive
                                    ? "scale-110"
                                    : "group-hover:scale-110"
                                }`}
                              />
                              {item.key === "notifications" &&
                                unreadCount > 0 && (
                                  <div
                                    className={`absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-[#0892d0] transition-opacity duration-200 delay-100 ${isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                                  >
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                  </div>
                                )}
                              {item.key === "announcements" &&
                                unreadAnnouncementsCount > 0 && (
                                  <div
                                    className={`absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-[#0892d0] transition-opacity duration-200 delay-100 ${isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                                  >
                                    {unreadAnnouncementsCount > 9
                                      ? "9+"
                                      : unreadAnnouncementsCount}
                                  </div>
                                )}
                            </div>

                            <span
                              className={`truncate transition-all duration-300 ${isActive ? "translate-x-0" : "group-hover:translate-x-0.5"} pr-2 ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}
                            >
                              {t(item.label.toLowerCase().replace(/[^a-z0-9]/g, "_"))}
                            </span>

                            {item.key === "notifications" &&
                              unreadCount > 0 && (
                                <div
                                  className={`absolute right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-lg transition-opacity duration-200 delay-100 ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                                >
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </div>
                              )}
                            {item.key === "announcements" &&
                              unreadAnnouncementsCount > 0 && (
                                <div
                                  className={`absolute right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-lg transition-opacity duration-200 delay-100 ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                                >
                                  {unreadAnnouncementsCount > 9
                                    ? "9+"
                                    : unreadAnnouncementsCount}
                                </div>
                              )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div ref={profileContainerRef} className="mt-auto px-3 pb-5 relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className={`flex w-full items-center rounded-lg bg-white/10 backdrop-blur-md p-2 border border-white/10 transition-all duration-300 hover:bg-white/20 ${isCollapsed ? "justify-center gap-0" : "px-2.5 gap-2.5"}`}
            aria-label="Open profile menu"
          >
            <div
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${user.profilePicture ? "" : getAvatarColor(user.name)} text-xs font-black text-white border border-white/20 shadow-inner overflow-hidden`}
            >
              {user.profilePicture ? (
                <img
                  src={getAssetUrl(user.profilePicture)}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                user.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <div
              className={`text-left transition-all duration-300 ease-in-out ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 min-w-0 flex-1"}`}
            >
              <p className="truncate text-xs font-black text-white">
                {user.name}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 truncate">
                {getLocalizedRoleText()}
              </p>
            </div>
          </button>

          {isProfileOpen && (
            <div
              className={`absolute bottom-full mb-4 overflow-hidden rounded-xl bg-[#1e1b4b] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-4 duration-300 backdrop-blur-2xl z-50 ${
                isCollapsed ? "w-64 -left-2" : "w-full left-0"
              }`}
            >
              <div className="border-b border-white/10 px-4 py-4">
                <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-1">
                  Account
                </p>
                <p className="truncate text-sm font-black text-white">
                  {user.name}
                </p>
                <p className="truncate text-[11px] font-medium text-white/50">
                  {user.email}
                </p>
              </div>
              <div className="p-2 space-y-1">
                {/* System Settings in Profile Menu */}
                <button
                  type="button"
                  onClick={() => onNavigate({ key: "settings" })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  {t("system_setting")}
                </button>

                <div className="h-px bg-white/5 mx-2 my-1"></div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Button - Vertically Centered Tab Style */}
        <button
          type="button"
          className="absolute left-full top-1/2 -translate-y-1/2 z-[1200] flex h-14 w-6 items-center justify-center rounded-r-2xl bg-[#1e1b4b] border-y border-r border-white/10 text-white shadow-[10px_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:w-8 hover:bg-[#2e1065] opacity-20 hover:opacity-100 lg:flex hidden group"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 transition-transform group-hover:scale-125" />
          ) : (
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:scale-125" />
          )}

          {/* Subtle glow effect on the edge */}
          <div className="absolute inset-y-2 left-0 w-[2px] bg-white/20 blur-[1px]"></div>
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
