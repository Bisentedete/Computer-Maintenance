import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import TechDashboard from "@/pages/TechDashboard";
import UserDashboard from "@/pages/UserDashboard";
import Computers from "@/pages/Computers";
import ComputerDetails from "@/pages/ComputerDetails";
import ProblemReports from "@/pages/ProblemReports";
import ReportDetails from "@/pages/ReportDetails";
import ReportProblem from "@/pages/ReportProblem";
import Maintenance from "@/pages/Maintenance";
import MaintenanceForm from "@/pages/MaintenanceForm";
import MaintenanceHistory from "@/pages/MaintenanceHistory";
import Technicians from "@/pages/Technicians";
import Schedules from "@/pages/Schedules";
import Analytics from "@/pages/Analytics";
import Users from "@/pages/Users";
import Troubleshooting from "@/pages/Troubleshooting";
import ComputerStatusUser from "@/pages/ComputerStatusUser";
import Settings from "@/pages/Settings";
import Alerts from "@/pages/Alerts";
import "@/App.css";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "technician") return <TechDashboard />;
  return <UserDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route index element={<RoleDashboard />} />
            <Route path="computers" element={<Protected roles={["admin", "technician"]}><Computers /></Protected>} />
            <Route path="computers/:id" element={<Protected roles={["admin", "technician"]}><ComputerDetails /></Protected>} />
            <Route path="alerts" element={<Protected roles={["admin", "technician"]}><Alerts /></Protected>} />
            <Route path="reports" element={<Protected roles={["admin"]}><ProblemReports /></Protected>} />
            <Route path="reports/:id" element={<Protected roles={["admin", "technician"]}><ReportDetails /></Protected>} />
            <Route path="report" element={<Protected roles={["user", "admin"]}><ReportProblem /></Protected>} />
            <Route path="my-reports" element={<Protected roles={["user"]}><ProblemReports mine /></Protected>} />
            <Route path="computer-status" element={<Protected roles={["user"]}><ComputerStatusUser /></Protected>} />
            <Route path="maintenance" element={<Protected roles={["admin", "technician"]}><Maintenance /></Protected>} />
            <Route path="maintenance/new" element={<Protected roles={["admin", "technician"]}><MaintenanceForm /></Protected>} />
            <Route path="history" element={<Protected roles={["admin", "technician"]}><MaintenanceHistory /></Protected>} />
            <Route path="technicians" element={<Protected roles={["admin"]}><Technicians /></Protected>} />
            <Route path="schedules" element={<Protected roles={["admin"]}><Schedules /></Protected>} />
            <Route path="analytics" element={<Protected roles={["admin"]}><Analytics /></Protected>} />
            <Route path="users" element={<Protected roles={["admin"]}><Users /></Protected>} />
            <Route path="troubleshooting" element={<Troubleshooting />} />
            <Route path="settings" element={<Protected roles={["admin"]}><Settings /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
