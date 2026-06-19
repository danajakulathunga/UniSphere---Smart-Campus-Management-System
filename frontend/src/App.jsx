import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import LecturerDashboard from "./pages/LecturerDashboard";
import OAuth2RedirectHandler from "./pages/OAuth2RedirectHandler";
import OAuthSuccess from "./pages/OAuthSuccess";
import ResourcesPage from "./pages/ResourcesPage";
import BookingsPage from "./pages/BookingsPage";
import TicketsPage from "./pages/TicketsPage";
import NotificationsPage from "./pages/NotificationsPage";
import UsersPage from "./pages/UsersPage";
import StaffPage from "./pages/StaffPage";
import MyLecturesPage from "./pages/MyLecturesPage";
import LecturerStudentsPage from "./pages/LecturerStudentsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AttendanceCheckinPage from "./pages/AttendanceCheckinPage";
import ScrollToTopButton from "./components/ScrollToTopButton";
import {
  decodeJwtPayload,
  getLandingRoute,
  normalizeRoles,
  useAuth,
} from "./context/AuthContext";

function App() {
  const { token, user, loading } = useAuth();
  const tokenRoles = token ? decodeJwtPayload(token)?.roles : [];
  const effectiveRoles = user?.roles || normalizeRoles(tokenRoles);
  const defaultRoute = token ? getLandingRoute(effectiveRoles) : "/";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-700">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 transition-colors duration-300 dark:text-slate-100">
      <Routes>
        <Route
          path="/"
          element={
            token ? <Navigate to={defaultRoute} replace /> : <LandingPage />
          }
        />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route
          path="/admin-registration"
          element={<AuthPage fixedRole="ADMIN" />}
        />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
        <Route path="/attendance-checkin/:sessionId" element={<AttendanceCheckinPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={["USER", "LECTURER"]} />}>
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/lecturer-dashboard" element={<LecturerDashboard />} />
          <Route
            path="/dashboard"
            element={<Navigate to={defaultRoute} replace />}
          />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["LECTURER"]} />}>
          <Route path="/lecturer/students" element={<LecturerStudentsPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["USER", "ADMIN", "TECHNICIAN", "LECTURER"]}
            />
          }
        >
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN", "LECTURER"]} />
          }
        >
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/my-lectures" element={<MyLecturesPage />} />
        </Route>

        {/* Role Specific Protect Routes */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/staff" element={<StaffPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["TECHNICIAN"]} />}>
          <Route
            path="/technician-dashboard"
            element={<TechnicianDashboard />}
          />
        </Route>

        <Route
          path="/unauthorized"
          element={
            <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
              <div className="glass-card animate-fade-up w-full rounded-3xl p-8 text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                  Access denied
                </p>
                <h1 className="mb-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  Unauthorized access
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Your account does not have permission to view this page.
                </p>
              </div>
            </div>
          }
        />

        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
      <ScrollToTopButton />
    </div>
  );
}

export default App;
