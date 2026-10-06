import React from "react";
import { Link } from "react-router-dom";
import { Bot, Wrench, ClipboardPlus } from "lucide-react";
import { Button } from "@/components/UI";

function renderText(text) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
    );
    return <p key={i} className={line.trim() === "" ? "h-2" : ""}>{parts}</p>;
  });
}

export default function ChatMessage({ m, computerId, role, streaming }) {
  const isUser = m.role === "user";
  const s = m.suggestion;
  const reportHref = role === "technician"
    ? `/maintenance/new?computer=${encodeURIComponent(computerId || "")}`
    : `/report?from=assistant&computer=${encodeURIComponent(computerId || "")}&type=${encodeURIComponent(s?.problem_type || "")}&description=${encodeURIComponent(s?.description || "")}`;

  return (
    <div data-testid={`chat-msg-${m.role}`} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 shrink-0 rounded-md bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100">
          <Bot size={14} />
        </div>
      )}
      <div className={`max-w-[78%] rounded-md px-3 py-2 text-sm border leading-relaxed ${isUser ? "bg-blue-800 text-white border-blue-800" : "bg-white text-gray-800 border-gray-200"}`}>
        {renderText(m.content)}
        {streaming && <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-0.5 align-middle animate-pulse" />}
        {s && !streaming && (
          <div data-testid="chat-suggestion" className="mt-3 pt-3 border-t border-gray-200 flex items-start gap-2">
            <Wrench size={14} className="mt-0.5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900">A technician should look at this.</div>
              <div className="text-[11px] text-gray-500 truncate">{s.problem_type}{s.description ? ` — ${s.description}` : ""}</div>
            </div>
            <Link to={reportHref} className="shrink-0">
              <Button testid="chat-submit-report" className="h-7 text-xs px-2"><ClipboardPlus size={13} /> {role === "technician" ? "Maintenance record" : "Submit maintenance report"}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
