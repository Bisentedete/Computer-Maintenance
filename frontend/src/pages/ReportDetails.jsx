import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Button, Select } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft } from "lucide-react";

export default function ReportDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [r, setR] = useState(null);
  const [techs, setTechs] = useState([]);
  const [selTech, setSelTech] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const load = () => api.get(`/reports/${id}`).then((res) => {
    setR(res.data);
    setStatus(res.data.status);
    setPriority(res.data.priority);
  });

  useEffect(() => {
    load();
    api.get("/technicians").then((r) => setTechs(r.data));
  }, [id]);

  if (!r) return <div className="text-sm text-gray-500">Loading…</div>;

  const assign = async () => {
    if (!selTech) return;
    await api.post(`/reports/${id}/assign`, { technician_id: selTech });
    setSelTech("");
    load();
  };

  const update = async () => {
    await api.patch(`/reports/${id}`, { status, priority });
    load();
  };

  const isAdmin = user?.role === "admin";
  const isTech = user?.role === "technician";

  return (
    <div>
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 mb-3">
        <ArrowLeft size={14} /> Back
      </button>

      <PageHeader
        testid="report-details"
        title={`Report #${r.report_number}`}
        subtitle={<span className="flex items-center gap-2">Computer: <span className="font-mono">{r.computer_id}</span><StatusBadge value={r.status} /></span>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Problem Details</h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm mb-4">
            <dt className="text-xs text-gray-500">Reported by</dt><dd className="text-gray-900">{r.reported_by_name}</dd>
            <dt className="text-xs text-gray-500">Date reported</dt><dd className="text-gray-900">{new Date(r.created_at).toLocaleString()}</dd>
            <dt className="text-xs text-gray-500">Priority</dt><dd><StatusBadge value={r.priority} /></dd>
            <dt className="text-xs text-gray-500">Status</dt><dd><StatusBadge value={r.status} /></dd>
            <dt className="text-xs text-gray-500">Assigned technician</dt><dd className="text-gray-900">{r.assigned_technician_name || "— Not yet assigned"}</dd>
          </dl>
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">Problem</div>
            <div className="text-sm text-gray-900">{r.problem_type}</div>
          </div>
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">Description</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{r.description}</div>
          </div>
          {r.additional_details && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Additional details</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{r.additional_details}</div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {isAdmin && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Assign Technician</h3>
              <Select value={selTech} onChange={(e) => setSelTech(e.target.value)} className="w-full mb-2" data-testid="assign-tech-select">
                <option value="">— Select technician —</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>)}
              </Select>
              <Button testid="assign-tech-btn" onClick={assign} className="w-full">Assign</Button>
            </Card>
          )}

          {(isAdmin || isTech) && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Update</h3>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full mb-3">
                {["Pending", "Assigned", "In Progress", "Resolved", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
              </Select>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full mb-3">
                {["Low", "Medium", "High", "Critical"].map((s) => <option key={s}>{s}</option>)}
              </Select>
              <Button onClick={update} className="w-full" testid="update-report-btn">Save changes</Button>
            </Card>
          )}

          <Card className="p-5 space-y-2">
            <Link to={`/computers/${r.computer_id}`} className="block text-sm text-blue-800 hover:underline">View computer →</Link>
            {(isAdmin || isTech) && (
              <Link to={`/maintenance/new?report=${r.id}&computer=${r.computer_id}`} className="block text-sm text-blue-800 hover:underline">
                Add maintenance record →
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
