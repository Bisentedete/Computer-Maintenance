import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, CardTitle, Th, Td, Empty, Button } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { AlertTriangle, ClipboardList, Server, MessageSquare, ArrowRight } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.get("/reports").then((r) => setReports(r.data.slice(0, 6)));
  }, []);

  const tiles = [
    { to: "/report", label: "Report a Problem", desc: "Submit a new computer issue", icon: AlertTriangle },
    { to: "/my-reports", label: "My Reports", desc: "Track your submitted reports", icon: ClipboardList },
    { to: "/computer-status", label: "Computer Status", desc: "See which computers are available", icon: Server },
    { to: "/troubleshooting", label: "Troubleshooting Support", desc: "Get basic troubleshooting guidance", icon: MessageSquare },
  ];

  return (
    <div>
      <PageHeader
        testid="user-dashboard"
        title={`Welcome, ${user?.name?.split(" ")[0] || "User"}`}
        subtitle="Report issues and track your maintenance requests."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {tiles.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            data-testid={`tile-${to.replace("/", "")}`}
            className="group rounded-md border border-gray-200 bg-white p-5 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-blue-50 p-2 text-blue-800"><Icon size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">{label}</span>
                  <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-800 transition-colors" />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <CardTitle right={<Link to="/my-reports" className="text-xs text-blue-800 hover:underline">View all</Link>}>
          My Recent Reports
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer</Th><Th>Problem</Th><Th>Status</Th><Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={4}><Empty>You haven't submitted any reports yet.</Empty></td></tr>
              ) : reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-mono">{r.computer_id}</Td>
                  <Td>{r.problem_type}</Td>
                  <Td><StatusBadge value={r.status} /></Td>
                  <Td className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
