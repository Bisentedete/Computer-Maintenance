import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, CardTitle, Th, Td, Empty, Button } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, Wrench, FileText, History } from "lucide-react";

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
    api.get(`/computers/${id}`).then((r) => setC(r.data));
  }, [id]);

  if (!c) return <div className="text-sm text-gray-500">Loading…</div>;

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

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Current Status
            <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-gray-400">placeholder — monitoring API</span>
          </h3>
          <div className="flex items-center gap-2 mb-4">
            <span className={`h-2 w-2 rounded-full ${c.online ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="text-sm text-gray-900">{c.online ? "Online" : "Offline"}</span>
          </div>
          <div className="space-y-3">
            <Bar label="CPU usage" value={c.cpu_usage ?? 0} />
            <Bar label="RAM usage" value={c.ram_usage ?? 0} />
            <Bar label="Storage usage" value={c.storage_usage ?? 0} />
          </div>
          <div className="text-[11px] text-gray-500 mt-4">
            Last check: {new Date(c.last_check).toLocaleString()}
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
