import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty, Button } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";

const TABS = ["All", "Pending", "Assigned", "In Progress", "Resolved"];

export default function Maintenance() {
  const [tab, setTab] = useState("All");
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.get("/reports").then((r) => setReports(r.data));
  }, []);

  const filtered = tab === "All" ? reports : reports.filter((r) => r.status === tab);

  return (
    <div>
      <PageHeader
        testid="maintenance-page"
        title="Maintenance"
        subtitle="Open maintenance work from reported computer problems."
      />

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            data-testid={`maintenance-tab-${t.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
              tab === t ? "border-blue-800 text-blue-800 font-medium" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer</Th><Th>Problem</Th><Th>Technician</Th>
                <Th>Status</Th><Th>Date Reported</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><Empty /></td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-mono">{r.computer_id}</Td>
                  <Td>{r.problem_type}</Td>
                  <Td className="text-gray-600">{r.assigned_technician_name || "— Unassigned"}</Td>
                  <Td><StatusBadge value={r.status} /></Td>
                  <Td className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</Td>
                  <Td className="flex gap-2">
                    <Link to={`/reports/${r.id}`} className="text-xs text-blue-800 hover:underline">Open</Link>
                    <Link to={`/maintenance/new?report=${r.id}&computer=${r.computer_id}`} className="text-xs text-blue-800 hover:underline">Record</Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
