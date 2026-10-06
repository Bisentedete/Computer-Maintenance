import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty, Button, Input, Select } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Computers() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [lab, setLab] = useState("All");
  const [status, setStatus] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    computer_id: "", laboratory: "Computer Lab 1", processor: "", ram: "", storage: "", operating_system: "",
  });

  const load = () => api.get("/computers").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const labs = useMemo(() => ["All", ...Array.from(new Set(list.map((c) => c.laboratory)))], [list]);

  const filtered = list.filter((c) =>
    (lab === "All" || c.laboratory === lab) &&
    (status === "All" || c.status === status) &&
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
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer ID</Th><Th>Laboratory</Th><Th>Status</Th>
                <Th>Condition</Th><Th>Last Maintenance</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><Empty /></td></tr>
              ) : filtered.map((c) => (
                <tr key={c.computer_id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-mono font-medium text-gray-900">{c.computer_id}</Td>
                  <Td>{c.laboratory}</Td>
                  <Td><StatusBadge value={c.status} /></Td>
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
