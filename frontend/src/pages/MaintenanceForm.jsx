import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, Label, Button, Select, Input, Textarea } from "@/components/UI";

export default function MaintenanceForm() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [computers, setComputers] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    computer_id: params.get("computer") || "",
    report_id: params.get("report") || "",
    diagnosis: "",
    damaged_part: "",
    action_taken: "",
    technician_comment: "",
    preventive_suggestion: "",
    status: "Resolved",
    maintenance_type: "Hardware Maintenance",
  });

  useEffect(() => {
    api.get("/computers").then((r) => setComputers(r.data));
    api.get("/reports").then((r) => setReports(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/maintenance", form);
    nav("/history");
  };

  return (
    <div>
      <PageHeader
        testid="maintenance-form-page"
        title="Maintenance Record"
        subtitle="Document the diagnosis and repair for a computer."
      />
      <Card className="p-6 max-w-3xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Computer</Label>
              <Select value={form.computer_id} onChange={(e) => setForm({ ...form, computer_id: e.target.value })} className="w-full" required data-testid="mr-computer">
                <option value="">— Select —</option>
                {computers.map((c) => <option key={c.computer_id} value={c.computer_id}>{c.computer_id} — {c.laboratory}</option>)}
              </Select>
            </div>
            <div>
              <Label>Related Problem Report</Label>
              <Select value={form.report_id} onChange={(e) => setForm({ ...form, report_id: e.target.value })} className="w-full">
                <option value="">— None —</option>
                {reports.map((r) => <option key={r.id} value={r.id}>#{r.report_number} — {r.computer_id} — {r.problem_type}</option>)}
              </Select>
            </div>
            <div>
              <Label>Maintenance Type</Label>
              <Select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} className="w-full">
                {["Preventive Maintenance", "Hardware Maintenance", "Software Maintenance", "Network Maintenance", "General Inspection"].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
                <option>In Progress</option>
                <option>Resolved</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Diagnosis</Label>
            <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} required data-testid="mr-diagnosis" />
          </div>
          <div>
            <Label>Damaged / Replaced Part</Label>
            <Input value={form.damaged_part} onChange={(e) => setForm({ ...form, damaged_part: e.target.value })} />
          </div>
          <div>
            <Label>Action Taken</Label>
            <Textarea rows={3} value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} required />
          </div>
          <div>
            <Label>Technician Comment</Label>
            <Textarea rows={2} value={form.technician_comment} onChange={(e) => setForm({ ...form, technician_comment: e.target.value })} />
          </div>
          <div>
            <Label>Preventive Suggestion</Label>
            <Textarea rows={2} value={form.preventive_suggestion} onChange={(e) => setForm({ ...form, preventive_suggestion: e.target.value })} />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => nav(-1)}>Cancel</Button>
            <Button type="submit" testid="save-maintenance-btn">Save Maintenance Record</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
