import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useAlerts(intervalMs = 30000) {
  const [data, setData] = useState({ alerts: [], unread: 0 });

  const load = useCallback(() => api.get("/alerts").then((r) => setData(r.data)).catch(() => {}), []);

  useEffect(() => {
    load();
    const t = setInterval(load, intervalMs);
    return () => clearInterval(t);
  }, [load, intervalMs]);

  const ack = async (id) => { await api.post(`/alerts/${id}/ack`); load(); };
  const ackAll = async () => { await api.post("/alerts/ack-all"); load(); };

  return { ...data, reload: load, ack, ackAll };
}

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
