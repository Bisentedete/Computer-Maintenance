import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Card, Input, Select } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { Search } from "lucide-react";

export default function ComputerStatusUser() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [lab, setLab] = useState("All");

  useEffect(() => { api.get("/computers").then((r) => setList(r.data)); }, []);
  const labs = ["All", ...Array.from(new Set(list.map((c) => c.laboratory)))];

  const filtered = list.filter((c) =>
    (lab === "All" || c.laboratory === lab) &&
    (q === "" || c.computer_id.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <PageHeader testid="user-status-page" title="Computer Status" subtitle="See which laboratory computers are available." />
      <Card className="mb-4">
        <div className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search computer ID…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={lab} onChange={(e) => setLab(e.target.value)}>
            {labs.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </div>
      </Card>
      <Card>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((c) => (
            <div key={c.computer_id} className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
              <div>
                <div className="font-mono text-sm text-gray-900">{c.computer_id}</div>
                <div className="text-[11px] text-gray-500">{c.laboratory}</div>
              </div>
              <StatusBadge value={c.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
