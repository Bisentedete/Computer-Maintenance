import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, WifiOff, Gauge } from "lucide-react";
import { useAlerts, alertMeta } from "@/hooks/useAlerts";

export default function AlertsBell() {
  const { alerts, unread, ack, ackAll } = useAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = alerts.filter((a) => a.status === "active");

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="alerts-bell"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        title="Alerts"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span data-testid="alerts-unread-count" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-4 text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div data-testid="alerts-panel" className="absolute right-0 mt-2 w-80 rounded-md border border-gray-200 bg-white shadow-md z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-900">Alerts ({active.length})</span>
            {unread > 0 && (
              <button data-testid="alerts-ack-all" onClick={ackAll} className="text-[11px] text-blue-800 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {active.length === 0 ? (
              <div data-testid="alerts-empty" className="px-3 py-6 text-center text-xs text-gray-500">No active alerts. All monitored computers are healthy.</div>
            ) : active.map((a) => (
              <div key={a.id} data-testid={`alert-${a.type}-${a.computer_id}`} className={`flex items-start gap-2 px-3 py-2.5 border-b border-gray-100 last:border-0 ${a.acknowledged ? "" : a.type === "offline" ? "bg-red-50/60" : "bg-amber-50/60"}`}>
                {a.type === "offline" ? <WifiOff size={14} className="mt-0.5 text-red-600 shrink-0" /> : <Gauge size={14} className="mt-0.5 text-amber-600 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <Link to={`/computers/${a.computer_id}`} onClick={() => setOpen(false)} className="font-mono text-sm text-gray-900 hover:underline">{a.computer_id}</Link>
                  <span className="ml-2 text-[11px] text-gray-700">{alertMeta(a).label}</span>
                  <div className="text-[11px] text-gray-500">{a.laboratory} · {alertMeta(a).describe(a)}</div>
                </div>
                {!a.acknowledged && (
                  <button data-testid={`alert-ack-${a.type}-${a.computer_id}`} onClick={() => ack(a.id)} className="text-[11px] text-gray-500 hover:text-gray-900 shrink-0">Dismiss</button>
                )}
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-200 text-right">
            <Link to="/alerts" onClick={() => setOpen(false)} data-testid="alerts-view-all" className="text-[11px] text-blue-800 hover:underline">View all alerts</Link>
          </div>
        </div>
      )}
    </div>
  );
}
