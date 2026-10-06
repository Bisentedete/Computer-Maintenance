import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty, Input, Select, Button } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { Search } from "lucide-react";

export default function ProblemReports({ mine }) {
  const [reports, setReports] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");

  useEffect(() => {
    api.get("/reports").then((r) => setReports(r.data));
  }, []);

  const filtered = reports.filter((r) =>
    (status === "All" || r.status === status) &&
    (priority === "All" || r.priority === priority) &&
    (q === "" || `${r.computer_id} ${r.problem_type} ${r.reported_by_name}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        testid={mine ? "my-reports-page" : "reports-page"}
        title={mine ? "My Reports" : "Problem Reports"}
        subtitle={mine ? "Reports you've submitted." : "All computer problems reported by users."}
        actions={mine && <Link to="/report"><Button>Report a Problem</Button></Link>}
      />

      <Card className="mb-4">
        <div className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search by computer, problem, or user…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" data-testid="search-reports" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["All", "Pending", "Assigned", "In Progress", "Resolved", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {["All", "Low", "Medium", "High", "Critical"].map((s) => <option key={s}>{s}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Report ID</Th><Th>Computer</Th><Th>Problem</Th>
                <Th>Reported By</Th><Th>Priority</Th><Th>Status</Th>
                <Th>Date</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><Empty /></td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-mono">#{r.report_number}</Td>
                  <Td className="font-mono">{r.computer_id}</Td>
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
    </div>
  );
}
