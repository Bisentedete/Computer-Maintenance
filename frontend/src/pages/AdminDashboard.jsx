import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, CardTitle, StatCard, Th, Td, Empty, Button } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import OnlineDot from "@/components/OnlineDot";
import { Monitor, CheckCircle2, Wrench, AlertTriangle, Activity } from "lucide-react";

function FleetCard({ fleet }) {
  const pct = fleet.total ? Math.round((fleet.with_agent / fleet.total) * 100) : 0;
  const items = [
    ["fleet-online", "Online", fleet.online, "bg-green-500"],
    ["fleet-offline", "Offline", fleet.offline, "bg-red-500"],
    ["fleet-no-agent", "No agent", fleet.no_agent, "bg-gray-300"],
  ];
  return (
    <Card className="mb-6" testid="fleet-card">
      <CardTitle right={<span className="text-xs text-gray-400">refreshes every 30 s</span>}>
        <span className="inline-flex items-center gap-2"><Activity size={14} /> Fleet Monitoring</span>
      </CardTitle>
      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {items.map(([id, label, val, dot]) => (
          <div key={id} className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <div>
              <div data-testid={id} className="text-xl font-semibold text-gray-900 leading-none">{val}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          </div>
        ))}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Agent coverage</span>
            <span data-testid="fleet-coverage" className="font-mono text-gray-900">{fleet.with_agent}/{fleet.total} · {pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-blue-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [computers, setComputers] = useState([]);

  useEffect(() => {
    const load = () => Promise.all([api.get("/stats"), api.get("/reports"), api.get("/computers")]).then(
      ([s, r, c]) => {
        setStats(s.data);
        setReports(r.data.slice(0, 5));
        setComputers(c.data.slice(0, 24));
      }
    );
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        testid="admin-dashboard"
        title={`${greet}, ${user?.name?.split(" ")[0] || "Administrator"}`}
        subtitle="Here's the current status of your computer laboratory."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard testid="stat-total" label="Total Computers" value={stats?.total_computers ?? "—"} icon={Monitor} tone="blue" />
        <StatCard testid="stat-operational" label="Operational" value={stats?.operational ?? "—"} icon={CheckCircle2} tone="green" />
        <StatCard testid="stat-maintenance" label="Under Maintenance" value={stats?.under_maintenance ?? "—"} icon={Wrench} tone="amber" />
        <StatCard testid="stat-problems" label="Reported Problems" value={stats?.reported_problems ?? "—"} icon={AlertTriangle} tone="red" />
      </div>

      {stats?.fleet && <FleetCard fleet={stats.fleet} />}

      <Card className="mb-6" testid="recent-reports-card">
        <CardTitle right={<Link to="/reports" className="text-xs text-blue-800 hover:underline">View all</Link>}>
          Recent Problem Reports
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer</Th><Th>Problem</Th><Th>Reported By</Th>
                <Th>Priority</Th><Th>Status</Th><Th>Date</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={7}><Empty /></td></tr>
              ) : reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-mono text-gray-900">{r.computer_id}</Td>
                  <Td>{r.problem_type}</Td>
                  <Td className="text-gray-600">{r.reported_by_name}</Td>
                  <Td><StatusBadge value={r.priority} /></Td>
                  <Td><StatusBadge value={r.status} /></Td>
                  <Td className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</Td>
                  <Td><Link to={`/reports/${r.id}`} className="text-xs text-blue-800 hover:underline">View</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card testid="status-overview-card">
        <CardTitle right={<Link to="/computers" className="text-xs text-blue-800 hover:underline">All computers</Link>}>
          Computer Status Overview
        </CardTitle>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {computers.map((c) => (
            <Link
              key={c.computer_id}
              to={`/computers/${c.computer_id}`}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <span className="font-mono text-sm text-gray-900">{c.computer_id}</span>
              <span className="inline-flex items-center gap-1.5">
                <OnlineDot computer={c} showLabel={false} testid={`overview-agent-${c.computer_id}`} />
                <span className={`h-2 w-2 rounded-sm ${
                  c.status === "Operational" ? "bg-green-500" :
                  c.status === "Under Maintenance" ? "bg-amber-500" : "bg-red-500"
                }`} />
              </span>
            </Link>
          ))}
        </div>
        <div className="px-4 pb-3 flex gap-4 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> dot = agent online</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-500" /> square = maintenance status</span>
        </div>
      </Card>
    </div>
  );
}
