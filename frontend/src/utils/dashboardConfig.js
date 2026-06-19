import {
  Bell,
  CalendarDays,
  ClipboardList,
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Wrench,
  Settings,
  Users,
  BookOpen,
  BellRing,
} from "lucide-react";

const accents = {
  USER: {
    accentClassName: "bg-gradient-to-r from-blue-600 to-indigo-600",
    accentButtonClassName: "bg-gradient-to-r from-blue-600 to-indigo-600",
    accentTextClassName: "text-blue-200",
  },
  ADMIN: {
    accentClassName: "bg-gradient-to-r from-[#1E2A50] to-[#3B4A89]",
    accentButtonClassName: "bg-gradient-to-r from-[#1E2A50] to-[#3B4A89]",
    accentTextClassName: "text-indigo-200",
  },
  TECHNICIAN: {
    accentClassName: "bg-gradient-to-r from-indigo-600 to-blue-600",
    accentButtonClassName: "bg-gradient-to-r from-indigo-600 to-blue-600",
    accentTextClassName: "text-indigo-200",
  },
  LECTURER: {
    accentClassName: "bg-gradient-to-r from-purple-600 to-indigo-600",
    accentButtonClassName: "bg-gradient-to-r from-purple-600 to-indigo-600",
    accentTextClassName: "text-purple-200",
  },
};

const dashboardRoutes = {
  USER: "/user-dashboard",
  ADMIN: "/admin-dashboard",
  TECHNICIAN: "/technician-dashboard",
  LECTURER: "/lecturer-dashboard",
};

export const getPrimaryRole = (roles = []) => {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("TECHNICIAN")) return "TECHNICIAN";
  if (roles.includes("LECTURER")) return "LECTURER";
  return "USER";
};

export const getRoleAccent = (role) => accents[role] || accents.USER;

export const getSidebarItems = (role) => {
  const dashboardRoute = dashboardRoutes[role] || dashboardRoutes.USER;

  const facilitiesItem = {
    key: "resources",
    label: "Facilities",
    icon: Building2,
    route: "/resources",
  };

  const ticketsLabel = role === "USER" ? "My Tickets" : "Tickets";
  const commonAfter = [
    { key: "tickets", label: ticketsLabel, icon: Wrench, route: "/tickets" },
    {
      key: "announcements",
      label: "Announcements",
      icon: BellRing,
      route: "/announcements",
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
      route: "/notifications",
    },
  ];

  const settingsItem = {
    key: "settings",
    label: "Settings",
    icon: Settings,
  };

  if (role === "ADMIN") {
    return [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        route: dashboardRoute,
      },
      facilitiesItem,
      {
        key: "users",
        label: "Students",
        icon: Users,
        route: "/users",
      },
      {
        key: "staff",
        label: "Staffs",
        icon: Users,
        route: "/staff",
      },
      {
        key: "bookings",
        label: "Bookings",
        icon: CalendarDays,
        route: "/bookings",
      },
      ...commonAfter,
      settingsItem,
    ];
  }

  if (role === "TECHNICIAN") {
    return [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        route: dashboardRoute,
      },
      facilitiesItem,
      ...commonAfter,
      settingsItem,
    ];
  }

  if (role === "LECTURER") {
    return [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        route: dashboardRoute,
      },
      facilitiesItem,
      {
        key: "students",
        label: "My Students",
        icon: Users,
        route: "/lecturer/students",
      },
      {
        key: "bookings",
        label: "My Bookings",
        icon: CalendarDays,
        route: "/bookings",
      },
      {
        key: "my-lectures",
        label: "My Lectures",
        icon: BookOpen,
        route: "/my-lectures",
      },
      ...commonAfter,
      settingsItem,
    ];
  }

  return [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      route: dashboardRoute,
    },
    facilitiesItem,
    {
      key: "bookings",
      label: "My Bookings",
      icon: CalendarDays,
      route: "/bookings",
    },
    {
      key: "my-lectures",
      label: "My Lectures",
      icon: BookOpen,
      route: "/my-lectures",
    },
    ...commonAfter,
    settingsItem,
  ];
};
