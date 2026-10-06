import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty, Input, Select } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { Search } from "lucide-react";

export default function MaintenanceHistory() {
  const [recs, setRecs] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");

  useEffect(() => {
    api.get("/maintenance").then((r) => setRecs(r.data));
  }, []);

  const types = ["All", "Preventive Maintenance", "Hardware Maintenance", "Software Maintenance", "Network Maintenance", "General Inspection"];
  const filtered = recs.filter((r) =>
    (type === "All" || r.maintenance_type === type) &&
    (q === "" || `${r.computer_id} ${r.diagnosis} ${r.technician_name}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        testid="history-page"
        title="Maintenance History"
        subtitle="A searchable log of every maintenance action."
      />

      <Card className="mb-4">
        <div className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search by computer, diagnosis, or technician…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Date</Th><Th>Computer</Th><Th>Type</Th>
                <Th>Diagnosis</Th><Th>Technician</Th>
                <Th>Action Taken</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><Empty /></td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="text-gray-600">{new Date(r.date_fixed).toLocaleDateString()}</Td>
                  <Td className="font-mono">{r.computer_id}</Td>
                  <Td className="text-gray-600">{r.maintenance_type}</Td>
                  <Td>{r.diagnosis}</Td>
                  <Td>{r.technician_name}</Td>
                  <Td className="text-gray-600 max-w-xs truncate">{r.action_taken}</Td>
                  <Td><StatusBadge value={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
