import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty, Button, Input, Select } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import OnlineDot from "@/components/OnlineDot";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const agentState = (c) => (c.monitoring !== "live" ? "No agent" : c.online ? "Online" : "Offline");

export default function Computers() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [lab, setLab] = useState("All");
  const [status, setStatus] = useState("All");
  const [agent, setAgent] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    computer_id: "", laboratory: "Computer Lab 1", processor: "", ram: "", storage: "", operating_system: "",
  });

  const load = () => api.get("/computers").then((r) => setList(r.data));
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const labs = useMemo(() => ["All", ...Array.from(new Set(list.map((c) => c.laboratory)))], [list]);
  const fleet = useMemo(() => ({
    online: list.filter((c) => agentState(c) === "Online").length,
    offline: list.filter((c) => agentState(c) === "Offline").length,
    noAgent: list.filter((c) => agentState(c) === "No agent").length,
  }), [list]);

  const filtered = list.filter((c) =>
    (lab === "All" || c.laboratory === lab) &&
    (status === "All" || c.status === status) &&
    (agent === "All" || agentState(c) === agent) &&
    (q === "" || c.computer_id.toLowerCase().includes(q.toLowerCase()))
  );

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/computers", form);
    setShowAdd(false);
    setForm({ computer_id: "", laboratory: "Computer Lab 1", processor: "", ram: "", storage: "", operating_system: "" });
    load();
  };

  return (
    <div>
      <PageHeader
        testid="computers-page"
        title="Computers"
        subtitle="Manage and monitor laboratory computers."
        actions={user?.role === "admin" && (
          <Button testid="add-computer-btn" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Computer
          </Button>
        )}
      />

      <Card className="mb-4">
        <div className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input data-testid="search-computers" placeholder="Search computer ID…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select data-testid="filter-lab" value={lab} onChange={(e) => setLab(e.target.value)}>
            {labs.map((l) => <option key={l}>{l}</option>)}
          </Select>
          <Select data-testid="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {["All", "Operational", "Under Maintenance", "Reported Problem"].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select data-testid="filter-agent" value={agent} onChange={(e) => setAgent(e.target.value)}>
            {["All", "Online", "Offline", "No agent"].map((s) => <option key={s} value={s}>{s === "All" ? "All agents" : s}</option>)}
          </Select>
        </div>
        <div data-testid="fleet-summary" className="px-3 py-2 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> <span data-testid="fleet-online">{fleet.online}</span> online</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> <span data-testid="fleet-offline">{fleet.offline}</span> offline</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-300" /> <span data-testid="fleet-no-agent">{fleet.noAgent}</span> without agent</span>
          <span className="ml-auto text-gray-400">Agent coverage {list.length ? Math.round(((fleet.online + fleet.offline) / list.length) * 100) : 0}% · refreshes every 30 s</span>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer ID</Th><Th>Laboratory</Th><Th>Status</Th>
                <Th>Agent</Th><Th>Condition</Th><Th>Last Maintenance</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><Empty /></td></tr>
              ) : filtered.map((c) => (
                <tr key={c.computer_id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-mono font-medium text-gray-900">{c.computer_id}</Td>
                  <Td>{c.laboratory}</Td>
                  <Td><StatusBadge value={c.status} /></Td>
                  <Td><OnlineDot computer={c} testid={`agent-${c.computer_id}`} /></Td>
                  <Td><StatusBadge value={c.condition} /></Td>
                  <Td className="text-gray-500">{new Date(c.last_maintenance).toLocaleDateString()}</Td>
                  <Td><Link to={`/computers/${c.computer_id}`} className="text-xs text-blue-800 hover:underline">View</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-md bg-white border border-gray-200 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Add Computer</h3>
            </div>
            <form onSubmit={submit} className="p-5 space-y-3">
              {[
                ["computer_id", "Computer ID (e.g. PC-051)"],
                ["laboratory", "Laboratory"],
                ["processor", "Processor"],
                ["ram", "RAM"],
                ["storage", "Storage"],
                ["operating_system", "Operating System"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                  <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" testid="save-computer-btn">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
