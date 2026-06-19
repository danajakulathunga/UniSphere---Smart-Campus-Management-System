import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import SettingsModal from "./SettingsModal";
import { useTranslation } from "react-i18next";

const RoleDashboardLayout = ({
  user,
  logout,
  title,
  items,
  children,
  displayRole,
  accentClassName,
  accentButtonClassName,
  accentTextClassName,
  subtitle,
  headerRight,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState(() => {
    const currentItem = items?.find((item) => item.route === location.pathname);
    return currentItem?.key || items?.[0]?.key || "dashboard";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const getPageHeader = (rawTitle, userRole) => {
    const roleHeaders = {
      ADMIN: {
        Dashboard: {
          main: "header_admin_dashboard_main",
          sub: "header_admin_dashboard_sub",
        },
        Resources: {
          main: "header_admin_resources_main",
          sub: "header_admin_resources_sub",
        },
        Bookings: {
          main: "header_admin_bookings_main",
          sub: "header_admin_bookings_sub",
        },
        Tickets: {
          main: "header_admin_tickets_main",
          sub: "header_admin_tickets_sub",
        },
        Notifications: {
          main: "header_admin_notifications_main",
          sub: "header_admin_notifications_sub",
        },
        "Students Management": {
          main: "header_admin_students_main",
          sub: "header_admin_students_sub",
        },
        "Staffs Management": {
          main: "header_admin_staffs_main",
          sub: "header_admin_staffs_sub",
        },
        Reports: {
          main: "header_admin_reports_main",
          sub: "header_admin_reports_sub",
        },
        Settings: {
          main: "header_admin_settings_main",
          sub: "header_admin_settings_sub",
        },
      },
      TECHNICIAN: {
        Dashboard: {
          main: "header_tech_dashboard_main",
          sub: "header_tech_dashboard_sub",
        },
        Resources: {
          main: "header_tech_resources_main",
          sub: "header_tech_resources_sub",
        },
        Tickets: {
          main: "header_tech_tickets_main",
          sub: "header_tech_tickets_sub",
        },
        Notifications: {
          main: "header_tech_notifications_main",
          sub: "header_tech_notifications_sub",
        },
        Settings: {
          main: "header_tech_settings_main",
          sub: "header_tech_settings_sub",
        },
      },
      USER: {
        Dashboard: {
          main: "header_user_dashboard_main",
          sub: "header_user_dashboard_sub",
        },
        "My Lectures": {
          main: "header_user_lectures_main",
          sub: "header_user_lectures_sub",
        },
        Resources: {
          main: "header_user_resources_main",
          sub: "header_user_resources_sub",
        },
        "My Bookings": {
          main: "header_user_bookings_main",
          sub: "header_user_bookings_sub",
        },
        "My Tickets": {
          main: "header_user_tickets_main",
          sub: "header_user_tickets_sub",
        },
        Notifications: {
          main: "header_user_notifications_main",
          sub: "header_user_notifications_sub",
        },
        Settings: {
          main: "header_user_settings_main",
          sub: "header_user_settings_sub",
        },
      },
      LECTURER: {
        Dashboard: {
          main: "header_lecturer_dashboard_main",
          sub: "header_lecturer_dashboard_sub",
        },
        "My Lectures": {
          main: "header_lecturer_lectures_main",
          sub: "header_lecturer_lectures_sub",
        },
        Resources: {
          main: "header_lecturer_resources_main",
          sub: "header_lecturer_resources_sub",
        },
        Bookings: {
          main: "header_lecturer_bookings_main",
          sub: "header_lecturer_bookings_sub",
        },
        Tickets: {
          main: "header_lecturer_tickets_main",
          sub: "header_lecturer_tickets_sub",
        },
        Notifications: {
          main: "header_lecturer_notifications_main",
          sub: "header_lecturer_notifications_sub",
        },
        "My Students": {
          main: "header_lecturer_students_main",
          sub: "header_lecturer_students_sub",
        },
        Settings: {
          main: "header_lecturer_settings_main",
          sub: "header_lecturer_settings_sub",
        },
      },
    };
    const rawRole = (userRole || "USER").toUpperCase();
    const roleMap = {
      "SYSTEM ADMINISTRATOR": "ADMIN",
      ADMINISTRATOR: "ADMIN",
      "SYSTEMS TECHNICIAN": "TECHNICIAN",
      STUDENT: "USER",
      USER: "USER",
      LECTURER: "LECTURER",
    };
    const role = roleMap[rawRole] || rawRole;
    const specificRole = roleHeaders[role] || roleHeaders.USER;

    // Map of specificRole keys to their corresponding i18n translation key(s)
    const titleTranslationKeys = {
      "Dashboard": ["dashboard"],
      "Resources": ["campus_resources"],
      "Campus Resources": ["campus_resources"],
      "Bookings": ["bookings", "my_bookings"],
      "My Bookings": ["my_bookings"],
      "Tickets": ["tickets", "my_tickets"],
      "My Tickets": ["my_tickets"],
      "Notifications": ["notifications"],
      "Students Management": ["students_management"],
      "Staffs Management": ["staffs_management"],
      "Reports": ["reports"],
      "Settings": ["settings"]
    };

    let headerInfo = null;

    // First try a direct match
    if (specificRole[rawTitle]) {
      headerInfo = specificRole[rawTitle];
    } else {
      // Find a key in specificRole whose translated title or english key matches rawTitle
      const matchedKey = Object.keys(specificRole).find(key => {
        if (key.toLowerCase() === rawTitle.toLowerCase()) return true;
        const transKeys = titleTranslationKeys[key] || [];
        return transKeys.some(tk => t(tk).toLowerCase() === rawTitle.toLowerCase());
      });
      if (matchedKey) {
        headerInfo = specificRole[matchedKey];
      }
    }

    if (!headerInfo) {
      headerInfo = {
        main: rawTitle,
        sub: "Campus Management Intelligence",
      };
    }

    return {
      main: t(headerInfo.main),
      sub: t(headerInfo.sub),
    };
  };

  const headerContent = getPageHeader(title, displayRole);

  useEffect(() => {
    const activeItem = items.find((item) => item.route === location.pathname);
    if (activeItem) {
      setActiveMenuKey(activeItem.key);
    }
  }, [items, location.pathname]);

  const handleNavigate = (item) => {
    if (item.key === "settings") {
      setIsSettingsOpen(true);
      return;
    }
    setActiveMenuKey(item.key);
    if (item.route) {
      // Use replace:false to always trigger navigation even on same route
      navigate(item.route, { replace: false });
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 transition-colors dark:text-slate-100">
      <Sidebar
        items={items}
        activeKey={activeMenuKey}
        onNavigate={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        user={user}
        displayRole={displayRole}
        accentClassName={accentClassName}
        accentButtonClassName={accentButtonClassName}
        accentTextClassName={accentTextClassName}
        onLogout={logout}
      />
      <main
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "lg:ml-[144px]" : "lg:ml-[320px]"
        }`}
      >
        <div
          className={`w-full mx-auto space-y-6 px-4 py-6 transition-all duration-300 ${
            isSidebarCollapsed
              ? "max-w-[1856px] sm:px-8 lg:px-10"
              : "max-w-[1700px] sm:px-8 lg:px-10"
          }`}
        >
          {/* Internal Page Header */}
          <header className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 lg:hidden mb-4">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/50 shadow-sm border border-slate-200 text-slate-600 transition-all hover:bg-white dark:bg-slate-900/50 dark:border-white/5 dark:text-slate-400"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                </div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl transition-all">
                  <span className="text-slate-900 dark:text-white">
                    {headerContent.main.split(" ")[0]}
                  </span>{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {headerContent.main.split(" ").slice(1).join(" ")}
                  </span>
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] mt-1.5 dark:text-slate-400 max-w-2xl truncate">
                  {subtitle || headerContent.sub}
                </p>
              </div>
              {headerRight && (
                <div className="hidden sm:block shrink-0">{headerRight}</div>
              )}
            </div>
          </header>

          <div className="space-y-6">{children}</div>
        </div>
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default RoleDashboardLayout;
