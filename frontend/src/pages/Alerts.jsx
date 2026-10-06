import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Card, Th, Td, Empty, Button } from "@/components/UI";
import StatusBadge from "@/components/StatusBadge";
import { useAlerts, timeAgo } from "@/hooks/useAlerts";
import { WifiOff } from "lucide-react";

export default function Alerts() {
  const { alerts, unread, ack, ackAll } = useAlerts(15000);
  const [tab, setTab] = useState("active");
  const shown = alerts.filter((a) => a.status === tab);

  return (
    <div>
      <PageHeader
        testid="alerts-page"
        title="Offline Alerts"
        subtitle="Computers whose monitoring agent stopped reporting for more than 2 minutes. Alerts clear automatically when the agent reports again."
        actions={unread > 0 && <Button testid="alerts-page-ack-all" variant="outline" onClick={ackAll}>Mark all read ({unread})</Button>}
      />

      <div className="flex gap-1 mb-3 border-b border-gray-200">
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
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Computer</Th><Th>Laboratory</Th><Th>Went Dark</Th><Th>Last Heartbeat</Th>
                <Th>{tab === "active" ? "Duration" : "Resolved"}</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={7}><Empty>{tab === "active" ? "All monitored computers are reporting." : "No resolved alerts yet."}</Empty></td></tr>
              ) : shown.map((a) => (
                <tr key={a.id} data-testid={`alert-row-${a.computer_id}`} className={`hover:bg-gray-50 transition-colors ${!a.acknowledged && a.status === "active" ? "bg-red-50/40" : ""}`}>
                  <Td>
                    <Link to={`/computers/${a.computer_id}`} className="inline-flex items-center gap-1.5 font-mono font-medium text-gray-900 hover:underline">
                      <WifiOff size={13} className="text-red-600" /> {a.computer_id}
                    </Link>
                  </Td>
                  <Td>{a.laboratory}</Td>
                  <Td className="text-gray-600">{new Date(a.started_at).toLocaleString()}</Td>
                  <Td className="text-gray-600">{new Date(a.last_heartbeat_at).toLocaleString()}</Td>
                  <Td className="text-gray-600">{a.status === "active" ? timeAgo(a.started_at).replace(" ago", "") : new Date(a.resolved_at).toLocaleString()}</Td>
                  <Td><StatusBadge value={a.status === "active" ? "Offline" : "Resolved"} /></Td>
                  <Td>
                    {a.status === "active" && !a.acknowledged && (
                      <button data-testid={`alert-row-ack-${a.computer_id}`} onClick={() => ack(a.id)} className="text-xs text-blue-800 hover:underline">Mark read</button>
                    )}
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
