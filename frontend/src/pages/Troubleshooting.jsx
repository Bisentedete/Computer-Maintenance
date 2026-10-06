import React, { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Card, Button, Input } from "@/components/UI";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ChatMessage from "@/components/ChatMessage";
import OnlineDot from "@/components/OnlineDot";
import { Send, Info, Plus, Trash2, MessageSquare } from "lucide-react";

const WELCOME = { role: "assistant", content: "Hi — pick the computer you're working on (optional) and describe what's happening. I can see its live CPU, RAM, storage, online status and alerts, and I'll walk you through steps to try." };

export default function Troubleshooting() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [computers, setComputers] = useState([]);
  const [computerId, setComputerId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const endRef = useRef(null);

  const loadSessions = () => api.get("/troubleshoot/sessions").then((r) => setSessions(r.data));
  useEffect(() => { loadSessions(); api.get("/computers").then((r) => setComputers(r.data)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, draft]);

  const openSession = async (s) => {
    const { data } = await api.get(`/troubleshoot/sessions/${s.id}/messages`);
    setActive(data.session); setMessages(data.messages); setComputerId(data.session.computer_id || ""); setDraft(null);
  };

  const newSession = () => { setActive(null); setMessages([]); setDraft(null); setMsg(""); };

  const removeSession = async (e, s) => {
    e.stopPropagation();
    await api.delete(`/troubleshoot/sessions/${s.id}`);
    if (active?.id === s.id) newSession();
    loadSessions();
  };

  const send = async (e) => {
    e?.preventDefault();
    const text = msg.trim();
    if (!text || busy) return;
    setBusy(true); setMsg("");
    let session = active;
    try {
      if (!session) {
        session = (await api.post("/troubleshoot/sessions", { computer_id: computerId || null })).data;
        setActive(session);
      }
      setMessages((h) => [...h, { id: `tmp-${Date.now()}`, role: "user", content: text }]);
      setDraft("");
      const res = await fetch(`${API_BASE}/troubleshoot/sessions/${session.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("clms_token")}` },
        body: JSON.stringify({ message: text, computer_id: computerId || "" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n"); buf = lines.pop();
        for (const l of lines) {
          if (!l.startsWith("data: ")) continue;
          const ev = JSON.parse(l.slice(6));
          if (ev.type === "delta") { acc += ev.content; setDraft(acc); }
          else if (ev.type === "done") { setMessages((h) => [...h, ev.message]); setDraft(null); }
          else if (ev.type === "error") throw new Error(ev.detail);
        }
      }
    } catch (err) {
      setDraft(null);
      setMessages((h) => [...h, { id: `err-${Date.now()}`, role: "assistant", content: "The assistant is unavailable right now. Please try again in a moment." }]);
    } finally {
      setBusy(false); loadSessions();
    }
  };

  const selected = computers.find((c) => c.computer_id === computerId);

  return (
    <div>
      <PageHeader testid="troubleshooting-page" title="Troubleshooting Assistant" subtitle="AI guidance grounded in the computer's live monitoring data." />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4">
        <Card className="flex flex-col max-h-[640px]" testid="chat-sessions">
          <div className="p-3 border-b border-gray-200">
            <Button testid="chat-new-session" variant="outline" className="w-full" onClick={newSession}><Plus size={14} /> New conversation</Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No previous conversations.</div>
            ) : sessions.map((s) => (
              <div key={s.id} data-testid={`chat-session-${s.id}`} onClick={() => openSession(s)}
                className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ${active?.id === s.id ? "bg-blue-50" : ""}`}>
                <MessageSquare size={13} className="mt-0.5 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-900 truncate">{s.title}</div>
                  <div className="text-[11px] text-gray-500 font-mono">{s.computer_id || "no computer"} · {new Date(s.updated_at).toLocaleDateString()}</div>
                </div>
                <button data-testid={`chat-session-delete-${s.id}`} onClick={(e) => removeSession(e, s)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600" title="Delete"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col min-w-0" testid="chat-card">
          <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs text-gray-600 shrink-0">Computer:</span>
            <Select value={computerId || "none"} onValueChange={(v) => setComputerId(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="chat-computer-select" className="w-full sm:w-72 h-8 text-xs">
                <SelectValue placeholder="— No specific computer —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No specific computer —</SelectItem>
                {computers.map((c) => <SelectItem key={c.computer_id} value={c.computer_id}>{c.computer_id} — {c.laboratory}</SelectItem>)}
              </SelectContent>
            </Select>
            {selected && (
              <div data-testid="chat-computer-live" className="flex items-center gap-3 text-[11px] text-gray-600 font-mono sm:ml-auto">
                <OnlineDot computer={selected} />
                {selected.monitoring === "live" && <span>CPU {selected.cpu_usage}% · RAM {selected.ram_usage}% · Disk {selected.storage_usage}%</span>}
              </div>
            )}
          </div>

          <div className="h-[440px] overflow-y-auto p-5 space-y-3 bg-gray-50/40">
            {messages.length === 0 && <ChatMessage m={WELCOME} role={user?.role} />}
            {messages.map((m) => <ChatMessage key={m.id} m={m} computerId={computerId} role={user?.role} />)}
            {draft !== null && <ChatMessage m={{ role: "assistant", content: draft || "…" }} role={user?.role} streaming />}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="border-t border-gray-200 p-3 flex items-center gap-2 bg-white">
            <Input data-testid="chat-input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={selected ? `Describe what's happening with ${selected.computer_id}…` : "Describe what's happening with the computer…"} disabled={busy} />
            <Button type="submit" testid="chat-send" disabled={busy || !msg.trim()}><Send size={14} /> Send</Button>
          </form>

          <div className="border-t border-gray-200 px-4 py-2.5 flex items-start gap-2 text-[11px] text-gray-500">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>AI suggestions are basic guidance and may be imperfect. Hardware repairs must be handled by authorized laboratory technicians.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
