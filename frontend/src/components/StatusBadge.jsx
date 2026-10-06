import React from "react";

const MAP = {
  Operational: "bg-green-100 text-green-800 border-green-200",
  "Under Maintenance": "bg-amber-100 text-amber-800 border-amber-200",
  "Reported Problem": "bg-red-100 text-red-800 border-red-200",
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Assigned: "bg-blue-50 text-blue-800 border-blue-200",
  "In Progress": "bg-blue-50 text-blue-800 border-blue-200",
  Resolved: "bg-green-100 text-green-800 border-green-200",
  Offline: "bg-red-100 text-red-800 border-red-200",
  "High CPU": "bg-amber-100 text-amber-800 border-amber-200",
  "High RAM": "bg-amber-100 text-amber-800 border-amber-200",
  Completed: "bg-green-100 text-green-800 border-green-200",
  Scheduled: "bg-blue-50 text-blue-800 border-blue-200",
  Cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  Low: "bg-gray-100 text-gray-700 border-gray-200",
  Medium: "bg-amber-100 text-amber-800 border-amber-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Critical: "bg-red-100 text-red-800 border-red-200",
  Good: "bg-green-100 text-green-800 border-green-200",
  "Needs Repair": "bg-amber-100 text-amber-800 border-amber-200",
  Available: "bg-green-100 text-green-800 border-green-200",
  Busy: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function StatusBadge({ value, testid }) {
  const cls = MAP[value] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      data-testid={testid}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {value || "—"}
    </span>
  );
}
