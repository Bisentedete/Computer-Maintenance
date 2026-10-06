import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Card, Th, Td, Empty } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";

export default function Technicians() {
  const [techs, setTechs] = useState([]);
  useEffect(() => { api.get("/technicians").then((r) => setTechs(r.data)); }, []);

  return (
    <div>
      <PageHeader testid="technicians-page" title="Technicians" subtitle="Manage technician assignments and workload." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Name</Th><Th>Specialization</Th><Th>Availability</Th>
                <Th>Assigned Tasks</Th><Th>Completed Tasks</Th>
              </tr>
            </thead>
            <tbody>
              {techs.length === 0 ? (
                <tr><td colSpan={5}><Empty>No technicians yet.</Empty></td></tr>
              ) : techs.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <Td className="font-medium text-gray-900">{t.name}</Td>
                  <Td>{t.specialization || "—"}</Td>
                  <Td><StatusBadge value={t.availability} /></Td>
                  <Td className="font-mono">{t.assigned_tasks}</Td>
                  <Td className="font-mono">{t.completed_tasks}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
