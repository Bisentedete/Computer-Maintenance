import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, CardTitle, StatCard, Th, Td, Empty } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { ClipboardList, Loader2, CheckCircle2, Clock } from "lucide-react";

export default function TechDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/stats/technician"), api.get("/reports")]).then(([s, r]) => {
      setStats(s.data);
      setReports(r.data);
    });
  }, []);

  return (
    <div>
      <PageHeader
        testid="tech-dashboard"
        title={`Good day, ${user?.name?.split(" ")[0] || "Technician"}`}
        subtitle="Your assigned maintenance tasks and open problem reports."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard testid="tech-stat-assigned" label="Assigned to Me" value={stats?.assigned ?? "—"} icon={ClipboardList} tone="blue" />
        <StatCard testid="tech-stat-progress" label="In Progress" value={stats?.in_progress ?? "—"} icon={Loader2} tone="amber" />
        <StatCard testid="tech-stat-completed" label="Completed" value={stats?.completed ?? "—"} icon={CheckCircle2} tone="green" />
        <StatCard testid="tech-stat-pending" label="Pending" value={stats?.pending ?? "—"} icon={Clock} tone="neutral" />
      </div>

      <Card>
        <CardTitle>My Maintenance Tasks</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer</Th><Th>Problem</Th><Th>Priority</Th>
                <Th>Status</Th><Th>Date</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={6}><Empty>No assigned tasks yet.</Empty></td></tr>
              ) : reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-mono">{r.computer_id}</Td>
                  <Td>{r.problem_type}</Td>
                  <Td><StatusBadge value={r.priority} /></Td>
                  <Td><StatusBadge value={r.status} /></Td>
                  <Td className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</Td>
                  <Td><Link to={`/reports/${r.id}`} className="text-xs text-blue-800 hover:underline">Open</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
