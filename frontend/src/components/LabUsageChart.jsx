import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import { api } from "@/lib/api";
import { Card, CardTitle } from "@/components/UI";

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const lab = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-gray-900 mb-1">{label}</div>
      <div className="text-gray-500 mb-1">{lab.monitored_computers}/{lab.total_computers} PCs monitored · {lab.samples} samples</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.fill }} />
          <span className="text-gray-600">{p.name}</span>
          <span className="ml-auto font-mono text-gray-900">{p.value}% <span className="text-gray-400">peak {lab[p.dataKey === "avg_cpu" ? "peak_cpu" : "peak_ram"]}%</span></span>
        </div>
      ))}
    </div>
  );
}

export default function LabUsageChart() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/stats/lab-usage").then((r) => setData(r.data.labs)); }, []);

  const hasData = data?.some((l) => l.avg_cpu !== null);

  return (
    <Card className="mb-4" testid="lab-usage-card">
      <CardTitle right={<span className="text-xs text-gray-400">average of agent samples, last 24 hours</span>}>
        Lab Usage Comparison
      </CardTitle>
      <div className="p-4">
        {data === null ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : !hasData ? (
          <div data-testid="lab-usage-empty" className="text-xs text-gray-500 border border-dashed border-gray-200 rounded p-6 text-center">
            No agent samples in the last 24 hours. Install the monitoring agent on lab PCs to compare usage.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-64" data-testid="lab-usage-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -20 }} barGap={4} barCategoryGap="30%">
                  <CartesianGrid stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="laboratory" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "#F9FAFB" }} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="avg_cpu" name="Avg CPU" fill="#1E40AF" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="avg_cpu" position="top" formatter={(v) => (v == null ? "" : `${v}%`)} style={{ fontSize: 10, fill: "#374151", fontFamily: "IBM Plex Mono" }} />
                  </Bar>
                  <Bar dataKey="avg_ram" name="Avg RAM" fill="#D97706" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="avg_ram" position="top" formatter={(v) => (v == null ? "" : `${v}%`)} style={{ fontSize: 10, fill: "#374151", fontFamily: "IBM Plex Mono" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2" data-testid="lab-usage-table">
              {data.map((l) => (
                <div key={l.laboratory} data-testid={`lab-usage-${l.laboratory.replace(/\s+/g, "-").toLowerCase()}`} className="flex items-center justify-between border-b border-gray-100 last:border-0 py-2">
                  <div>
                    <div className="text-sm text-gray-900">{l.laboratory}</div>
                    <div className="text-[11px] text-gray-500">{l.monitored_computers}/{l.total_computers} PCs monitored</div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    {l.avg_cpu === null ? (
                      <span className="text-gray-400">no data</span>
                    ) : (
                      <>
                        <div><span className="text-gray-500">CPU</span> <span className="text-gray-900">{l.avg_cpu}%</span></div>
                        <div><span className="text-gray-500">RAM</span> <span className="text-gray-900">{l.avg_ram}%</span></div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
