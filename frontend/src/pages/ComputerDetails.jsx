import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, CardTitle, Th, Td, Empty, Button } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, Wrench, FileText, History, Download } from "lucide-react";

async function downloadAgent() {
  const r = await api.get("/agent/download", { responseType: "blob" });
  const url = URL.createObjectURL(r.data);
  const a = Object.assign(document.createElement("a"), { href: url, download: "agent.py" });
  a.click();
  URL.revokeObjectURL(url);
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function Bar({ label, value }) {
  const color = value > 80 ? "bg-red-500" : value > 60 ? "bg-amber-500" : "bg-blue-700";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-mono">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ComputerDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => api.get(`/computers/${id}`).then((r) => active && setC(r.data));
    load();
    const t = setInterval(load, 10000);
    return () => { active = false; clearInterval(t); };
  }, [id]);

  if (!c) return <div className="text-sm text-gray-500">Loading…</div>;

  const live = c.monitoring === "live";
  const monitorLabel = !live ? "no agent" : c.online ? "live" : "offline";
  const monitorClass = !live ? "text-gray-400" : c.online ? "text-green-700" : "text-red-600";

  return (
    <div>
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 mb-3">
        <ArrowLeft size={14} /> Back
      </button>

      <PageHeader
        testid="computer-details"
        title={<span className="font-mono">{c.computer_id}</span>}
        subtitle={<span className="flex items-center gap-2">Laboratory: {c.laboratory} <StatusBadge value={c.status} /></span>}
        actions={
          <>
            <Link to="/report"><Button variant="outline"><FileText size={14} /> Report Problem</Button></Link>
            <Link to={`/maintenance/new?computer=${c.computer_id}`}><Button><Wrench size={14} /> Maintenance Record</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Basic Information</h3>
          <Row label="Computer ID" value={c.computer_id} mono />
          <Row label="Laboratory" value={c.laboratory} />
          <Row label="Processor" value={c.processor} />
          <Row label="RAM" value={c.ram} />
          <Row label="Storage" value={c.storage} />
          <Row label="Operating System" value={c.operating_system} />
          <Row label="Date Added" value={new Date(c.created_at).toLocaleDateString()} />
        </Card>

        <Card className="p-5" testid="monitoring-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            Current Status
            <span data-testid="monitoring-mode" className={`ml-2 text-[10px] font-normal uppercase tracking-wider ${monitorClass}`}>{monitorLabel}</span>
            {live && c.online && <span className="ml-auto text-[10px] text-gray-400">refreshes every 10 s</span>}
          </h3>
          <div className="flex items-center gap-2 mb-4">
            <span className={`h-2 w-2 rounded-full ${c.online ? "bg-green-500" : "bg-gray-400"}`} />
            <span data-testid="online-status" className="text-sm text-gray-900">{c.online ? "Online" : "Offline"}</span>
            {c.hostname && <span className="text-xs text-gray-500 font-mono ml-auto">{c.hostname}</span>}
          </div>
          {live ? (
            <div className="space-y-3">
              <Bar label="CPU usage" value={c.cpu_usage ?? 0} />
              <Bar label="RAM usage" value={c.ram_usage ?? 0} />
              <Bar label="Storage usage" value={c.storage_usage ?? 0} />
            </div>
          ) : (
            <div data-testid="no-agent-notice" className="text-xs text-gray-500 border border-dashed border-gray-200 rounded p-3">
              No monitoring agent has reported for this computer yet. Install the agent below to see live CPU, RAM and storage.
            </div>
          )}
          <div className="text-[11px] text-gray-500 mt-4" data-testid="last-heartbeat">
            {c.last_heartbeat ? `Last heartbeat: ${new Date(c.last_heartbeat).toLocaleString()}` : "Last heartbeat: never"}
            {c.uptime_seconds != null && ` · Uptime ${Math.floor(c.uptime_seconds / 3600)}h ${Math.floor((c.uptime_seconds % 3600) / 60)}m`}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Problem</h3>
          {c.current_problem ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900">{c.current_problem.problem_type}</div>
              <div className="text-xs text-gray-600">{c.current_problem.description}</div>
              <div className="flex items-center gap-2 pt-1">
                <StatusBadge value={c.current_problem.priority} />
                <StatusBadge value={c.current_problem.status} />
              </div>
              <Link to={`/reports/${c.current_problem.id}`} className="inline-block text-xs text-blue-800 hover:underline mt-2">
                View report →
              </Link>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No active problem.</div>
          )}
        </Card>
      </div>

      <Card className="p-5 mb-4" testid="agent-setup-card">
        <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2"><Download size={14} /> Monitoring Agent Setup</h3>
        <p className="text-xs text-gray-500 mb-3">Run this on {c.computer_id} to push CPU, RAM, storage and online status every 10 seconds.</p>
        <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside">
          <li>
            <button data-testid="download-agent-btn" onClick={downloadAgent} className="text-blue-800 hover:underline">Download agent.py</button>
            <span className="text-gray-500"> (server URL and API key are pre-filled)</span>
          </li>
          <li>Install the dependency: <code className="font-mono bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">pip install psutil</code></li>
          <li>Start the agent: <code data-testid="agent-run-cmd" className="font-mono bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">python agent.py --id {c.computer_id}</code></li>
        </ol>
      </Card>

      <Card>
        <CardTitle right={<span className="text-xs text-gray-500 flex items-center gap-1"><History size={12} /> {c.maintenance_history.length} records</span>}>
          Maintenance History
        </CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Date</Th><Th>Diagnosis</Th><Th>Action Taken</Th>
                <Th>Technician</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {c.maintenance_history.length === 0 ? (
                <tr><td colSpan={5}><Empty>No maintenance history.</Empty></td></tr>
              ) : c.maintenance_history.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="text-gray-600">{new Date(h.date_fixed).toLocaleDateString()}</Td>
                  <Td>{h.diagnosis}</Td>
                  <Td className="text-gray-600">{h.action_taken}</Td>
                  <Td>{h.technician_name}</Td>
                  <Td><StatusBadge value={h.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
