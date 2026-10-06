import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Card, Th, Td, Empty, Button, Select } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { useAlerts, timeAgo, alertMeta } from "@/hooks/useAlerts";
import { WifiOff, Gauge } from "lucide-react";

const TYPES = [["all", "All types"], ["offline", "Offline"], ["high_cpu", "High CPU"], ["high_ram", "High RAM"]];

export default function Alerts() {
  const { alerts, unread, ack, ackAll } = useAlerts(15000);
  const [tab, setTab] = useState("active");
  const [type, setType] = useState("all");
  const byTab = alerts.filter((a) => a.status === tab);
  const shown = byTab.filter((a) => type === "all" || a.type === type);

  return (
    <div>
      <PageHeader
        testid="alerts-page"
        title="Alerts"
        subtitle="Offline agents (silent > 2 min) and sustained high usage (≥ 90% CPU or RAM for 5 min). Alerts clear automatically when the computer recovers."
        actions={unread > 0 && <Button testid="alerts-page-ack-all" variant="outline" onClick={ackAll}>Mark all read ({unread})</Button>}
      />

      <div className="flex items-center gap-1 mb-3 border-b border-gray-200">
        {["active", "resolved"].map((t) => (
          <button
            key={t}
            data-testid={`alerts-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px transition-colors ${tab === t ? "border-blue-800 text-blue-800 font-medium" : "border-transparent text-gray-600 hover:text-gray-900"}`}
          >
            {t} ({alerts.filter((a) => a.status === t).length})
          </button>
        ))}
        <div className="ml-auto pb-1.5">
          <Select data-testid="alerts-type-filter" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer</Th><Th>Type</Th><Th>Laboratory</Th><Th>Started</Th><Th>Details</Th>
                <Th>{tab === "active" ? "Duration" : "Resolved"}</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={8}><Empty>{tab === "active" ? "No active alerts. All monitored computers are healthy." : "No resolved alerts yet."}</Empty></td></tr>
              ) : shown.map((a) => {
                const meta = alertMeta(a);
                const offline = a.type === "offline";
                return (
                  <tr key={a.id} data-testid={`alert-row-${a.type}-${a.computer_id}`} className={`hover:bg-gray-50 transition-colors ${!a.acknowledged && a.status === "active" ? (offline ? "bg-red-50/40" : "bg-amber-50/40") : ""}`}>
                    <Td>
                      <Link to={`/computers/${a.computer_id}`} className="inline-flex items-center gap-1.5 font-mono font-medium text-gray-900 hover:underline">
                        {offline ? <WifiOff size={13} className="text-red-600" /> : <Gauge size={13} className="text-amber-600" />} {a.computer_id}
                      </Link>
                    </Td>
                    <Td>{meta.label}</Td>
                    <Td>{a.laboratory}</Td>
                    <Td className="text-gray-600">{new Date(a.started_at).toLocaleString()}</Td>
                    <Td className="text-gray-600 font-mono text-xs">
                      {offline
                        ? `Last heartbeat ${new Date(a.last_heartbeat_at).toLocaleTimeString()}`
                        : `${a.status === "active" ? "now" : "last"} ${a.value}% · peak ${a.peak}%`}
                    </Td>
                    <Td className="text-gray-600">{a.status === "active" ? timeAgo(a.started_at).replace(" ago", "") : new Date(a.resolved_at).toLocaleString()}</Td>
                    <Td><StatusBadge value={a.status === "active" ? meta.badge : "Resolved"} /></Td>
                    <Td>
                      {a.status === "active" && !a.acknowledged && (
                        <button data-testid={`alert-row-ack-${a.type}-${a.computer_id}`} onClick={() => ack(a.id)} className="text-xs text-blue-800 hover:underline">Mark read</button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
