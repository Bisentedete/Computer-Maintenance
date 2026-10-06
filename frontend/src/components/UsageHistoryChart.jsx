import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/UI";

const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="text-gray-500 mb-1">{new Date(label).toLocaleString()}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.stroke }} />
          <span className="text-gray-600">{p.name}</span>
          <span className="ml-auto font-mono text-gray-900">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export default function UsageHistoryChart({ computerId, refreshKey }) {
  const [samples, setSamples] = useState(null);

  useEffect(() => {
    api.get(`/computers/${computerId}/telemetry/history`).then((r) => setSamples(r.data.samples));
  }, [computerId, refreshKey]);

  const avg = (k) => (samples?.length ? Math.round(samples.reduce((a, s) => a + s[k], 0) / samples.length) : null);
  const peak = (k) => (samples?.length ? Math.max(...samples.map((s) => s[k])) : null);

  return (
    <Card className="mb-4" testid="usage-history-card">
      <CardTitle right={
        samples?.length ? (
          <span data-testid="usage-history-summary" className="text-xs text-gray-500 font-mono">
            CPU avg {avg("cpu")}% · peak {peak("cpu")}% &nbsp;|&nbsp; RAM avg {avg("ram")}% · peak {peak("ram")}%
          </span>
        ) : null
      }>
        Usage History <span className="ml-1 text-xs font-normal text-gray-400">last 24 hours</span>
      </CardTitle>
      <div className="p-4">
        {samples === null ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : samples.length < 2 ? (
          <div data-testid="usage-history-empty" className="text-xs text-gray-500 border border-dashed border-gray-200 rounded p-6 text-center">
            Not enough samples yet. The chart fills in as the monitoring agent reports.
          </div>
        ) : (
          <div className="h-56" data-testid="usage-history-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={samples} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={fmtTime} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} minTickGap={40} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip content={<TooltipBox />} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="cpu" name="CPU" stroke="#1E40AF" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ram" name="RAM" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
