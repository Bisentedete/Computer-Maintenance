import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty, Button, Label, Select, Input } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { Plus } from "lucide-react";

export default function Schedules() {
  const [list, setList] = useState([]);
  const [computers, setComputers] = useState([]);
  const [techs, setTechs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    computer_id: "", maintenance_type: "Preventive Maintenance", technician_id: "", scheduled_date: "", notes: "",
  });

  const load = () => api.get("/schedules").then((r) => setList(r.data));
  useEffect(() => {
    load();
    api.get("/computers").then((r) => setComputers(r.data));
    api.get("/technicians").then((r) => setTechs(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { ...form, scheduled_date: new Date(form.scheduled_date).toISOString() };
    await api.post("/schedules", payload);
    setOpen(false);
    setForm({ computer_id: "", maintenance_type: "Preventive Maintenance", technician_id: "", scheduled_date: "", notes: "" });
    load();
  };

  return (
    <div>
      <PageHeader
        testid="schedules-page"
        title="Maintenance Schedule"
        subtitle="Plan and track upcoming maintenance."
        actions={<Button onClick={() => setOpen(true)} testid="add-schedule-btn"><Plus size={14} /> New Schedule</Button>}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Scheduled Date</Th><Th>Computer</Th><Th>Type</Th>
                <Th>Technician</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5}><Empty>No scheduled maintenance.</Empty></td></tr>
              ) : list.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="text-gray-600">{new Date(s.scheduled_date).toLocaleDateString()}</Td>
                  <Td className="font-mono">{s.computer_id}</Td>
                  <Td>{s.maintenance_type}</Td>
                  <Td>{s.technician_name}</Td>
                  <Td><StatusBadge value={s.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-md bg-white border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">New Schedule</h3>
            </div>
            <form onSubmit={submit} className="p-5 space-y-3">
              <div>
                <Label>Computer</Label>
                <Select value={form.computer_id} onChange={(e) => setForm({ ...form, computer_id: e.target.value })} className="w-full" required>
                  <option value="">— Select —</option>
                  {computers.map((c) => <option key={c.computer_id} value={c.computer_id}>{c.computer_id}</option>)}
                </Select>
              </div>
              <div>
                <Label>Maintenance Type</Label>
                <Select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} className="w-full">
                  {["Preventive Maintenance", "Hardware Maintenance", "Software Maintenance", "Network Maintenance", "General Inspection"].map((t) => <option key={t}>{t}</option>)}
                </Select>
              </div>
              <div>
                <Label>Technician</Label>
                <Select value={form.technician_id} onChange={(e) => setForm({ ...form, technician_id: e.target.value })} className="w-full" required>
                  <option value="">— Select —</option>
                  {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
