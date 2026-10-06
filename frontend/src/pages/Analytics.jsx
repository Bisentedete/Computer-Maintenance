import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Card, CardTitle, StatCard, Button } from "@/components/UI";
import { BarChart3, CheckCircle2, Clock, FileText } from "lucide-react";
import LabUsageChart from "@/components/LabUsageChart";

function Row({ label, value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-800">{label}</span>
        <span className="font-mono text-gray-600">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-blue-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/stats").then((r) => setStats(r.data)); }, []);

  if (!stats) return <div className="text-sm text-gray-500">Loading…</div>;
  const maxProblem = Math.max(1, ...stats.common_problems.map((p) => p.count));
  const maxPc = Math.max(1, ...stats.top_maintenance_computers.map((p) => p.count));

  return (
    <div>
      <PageHeader
        testid="analytics-page"
        title="Reports"
        subtitle="Summary of maintenance activity across the laboratory."
        actions={<Button variant="outline" testid="generate-report-btn"><FileText size={14} /> Generate Report</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Maintenance Requests" value={stats.total_reports} icon={BarChart3} tone="blue" />
        <StatCard label="Resolved Problems" value={stats.resolved_reports} icon={CheckCircle2} tone="green" />
        <StatCard label="Pending Problems" value={stats.pending_reports} icon={Clock} tone="amber" />
        <StatCard label="In Progress" value={stats.in_progress_reports} icon={Clock} tone="neutral" />
      </div>

      <LabUsageChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Most Common Problem Types</CardTitle>
          <div className="p-5">
            {stats.common_problems.length === 0 ? (
              <div className="text-sm text-gray-500">No data yet.</div>
            ) : stats.common_problems.map((p) => <Row key={p.name} label={p.name} value={p.count} max={maxProblem} />)}
          </div>
        </Card>
        <Card>
          <CardTitle>Computers With Most Maintenance</CardTitle>
          <div className="p-5">
            {stats.top_maintenance_computers.length === 0 ? (
              <div className="text-sm text-gray-500">No data yet.</div>
            ) : stats.top_maintenance_computers.map((p) => <Row key={p.computer_id} label={p.computer_id} value={p.count} max={maxPc} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}
