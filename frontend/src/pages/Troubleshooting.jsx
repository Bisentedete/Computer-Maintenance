import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, Button, Input } from "@/components/UI";
import { Send, Info } from "lucide-react";

export default function Troubleshooting() {
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState([
    { role: "assistant", text: "Hi — describe the issue with the computer and I'll suggest basic steps you can try. If it isn't resolved, you can submit a maintenance report." },
  ]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const send = async (e) => {
    e?.preventDefault();
    const text = msg.trim();
    if (!text || busy) return;
    setHistory((h) => [...h, { role: "user", text }]);
    setMsg("");
    setBusy(true);
    try {
      const { data } = await api.post("/troubleshoot", { message: text });
      setHistory((h) => [...h, { role: "assistant", text: data.reply }]);
    } catch {
      setHistory((h) => [...h, { role: "assistant", text: "Service unavailable. Please try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div>
      <PageHeader
        testid="troubleshooting-page"
        title="Troubleshooting Support"
        subtitle="Describe what is happening with the computer and get basic troubleshooting guidance."
      />

      <Card className="max-w-3xl">
        <div className="h-[480px] overflow-y-auto p-5 space-y-3 bg-gray-50/40">
          {history.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-md px-3 py-2 text-sm border ${
                m.role === "user"
                  ? "bg-blue-800 text-white border-blue-800"
                  : "bg-white text-gray-800 border-gray-200"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-gray-500">Thinking…</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="border-t border-gray-200 p-3 flex items-center gap-2 bg-white">
          <Input
            data-testid="chat-input"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Describe what happened to the computer…"
          />
          <Button type="submit" testid="chat-send" disabled={busy}>
            <Send size={14} /> Send
          </Button>
        </form>

        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>Troubleshooting suggestions are for basic guidance. Hardware repairs should be handled by authorized laboratory technicians.</span>
          </div>
          <Link to="/report" className="shrink-0">
            <Button variant="outline" testid="report-from-chat">Report this problem</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
