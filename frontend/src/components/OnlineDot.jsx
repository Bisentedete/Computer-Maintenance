import React from "react";

export default function OnlineDot({ computer, showLabel = true, testid }) {
  const live = computer.monitoring === "live";
  const state = !live ? "no-agent" : computer.online ? "online" : "offline";
  const dot = state === "online" ? "bg-green-500" : state === "offline" ? "bg-red-500" : "bg-gray-300";
  const label = state === "online" ? "Online" : state === "offline" ? "Offline" : "No agent";
  return (
    <span data-testid={testid} data-state={state} className="inline-flex items-center gap-1.5" title={label}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {showLabel && <span className={`text-xs ${state === "no-agent" ? "text-gray-400" : "text-gray-700"}`}>{label}</span>}
    </span>
  );
}
