import React from "react";

export function PageHeader({ title, subtitle, actions, testid }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6" data-testid={testid}>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", testid }) {
  return (
    <div data-testid={testid} className={`rounded-md border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
      <h2 className="text-sm font-semibold text-gray-900">{children}</h2>
      {right}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "neutral", testid }) {
  const tones = {
    neutral: "text-gray-700 bg-gray-50",
    green: "text-green-700 bg-green-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-blue-800 bg-blue-50",
  };
  return (
    <div data-testid={testid} className="rounded-md border border-gray-200 bg-white shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900 font-mono">{value}</div>
          {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
        </div>
        {Icon && (
          <div className={`rounded-md p-2 ${tones[tone]}`}>
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", testid, ...rest }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-800 text-white hover:bg-blue-900",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    subtle: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };
  return (
    <button data-testid={testid} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 ${props.className || ""}`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 ${props.className || ""}`}
    >
      {children}
    </select>
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 ${props.className || ""}`}
    />
  );
}

export function Empty({ children = "No records found." }) {
  return (
    <div className="text-center py-10 text-sm text-gray-500">
      {children}
    </div>
  );
}

export function Label({ children }) {
  return <label className="block text-xs font-semibold text-gray-700 mb-1.5">{children}</label>;
}

export function Th({ children, className = "" }) {
  return (
    <th className={`text-left text-[11px] uppercase tracking-wider text-gray-600 font-semibold px-3 py-2.5 bg-gray-50 border-b border-gray-200 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return <td className={`px-3 py-2.5 text-sm text-gray-800 border-b border-gray-100 ${className}`}>{children}</td>;
}
