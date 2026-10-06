import json
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

REPORT_RE = re.compile(r"<<REPORT:\s*(\{.*?\})\s*>>", re.S)
MAX_HISTORY = 20

SYSTEM_PROMPT = """You are the troubleshooting assistant for a school Computer Laboratory Maintenance System (CLMS).
You help students, faculty and technicians fix common lab-PC problems step by step, in plain, friendly language.

Rules:
- Use the LIVE COMPUTER CONTEXT below when it is present. Quote the actual numbers (CPU %, RAM %, storage %, online/offline, alerts) when relevant.
- Give at most 3-4 concrete steps per reply, numbered. Ask one clarifying question if the problem is unclear.
- Never invent hardware details that are not in the context.
- If the problem likely needs a technician (hardware failure, won't power on, offline for a long time, repeated issues, sustained high usage you cannot explain, suspected virus), say so clearly and append EXACTLY ONE marker at the very end of your reply in this form:
<<REPORT: {"problem_type": "<one of: Computer won't turn on | Slow performance | Keyboard problem | Mouse problem | Monitor/display problem | Network/internet problem | Software problem | Virus/malware concern | Printer problem | Other>", "description": "<one or two sentences summarising the issue and what was already tried>"}>>
- Do not mention the marker or JSON to the user; it is machine-read. Do not add the marker when the user can likely fix it themselves.
"""


def _fmt_dt(iso: Optional[str]) -> str:
    if not iso:
        return "never"
    return datetime.fromisoformat(iso).strftime("%b %d %H:%M UTC")


async def build_computer_context(db, computer_id: Optional[str]) -> str:
    if not computer_id:
        return "LIVE COMPUTER CONTEXT: none selected. Ask the user which computer (e.g. PC-012) if it matters."
    c = await db.computers.find_one({"computer_id": computer_id}, {"_id": 0})
    if not c:
        return f"LIVE COMPUTER CONTEXT: computer {computer_id} not found in inventory."
    hb = c.get("last_heartbeat")
    online = bool(hb) and (datetime.now(timezone.utc) - datetime.fromisoformat(hb)).total_seconds() <= 120
    lines = [
        f"LIVE COMPUTER CONTEXT for {computer_id}:",
        f"- Laboratory: {c.get('laboratory')} | Status: {c.get('status')} | Condition: {c.get('condition')}",
        f"- Specs: {c.get('processor')}, {c.get('ram')}, {c.get('storage')}, {c.get('operating_system')}",
    ]
    if hb:
        lines.append(f"- Monitoring agent: {'ONLINE' if online else 'OFFLINE'} (last heartbeat {_fmt_dt(hb)})")
        lines.append(f"- Latest readings: CPU {c.get('cpu_usage')}%, RAM {c.get('ram_usage')}%, Storage {c.get('storage_usage')}%")
        since = datetime.now(timezone.utc) - timedelta(hours=1)
        samples = await db.telemetry_samples.find({"computer_id": computer_id, "ts": {"$gte": since}}, {"_id": 0, "cpu": 1, "ram": 1}).to_list(1000)
        if samples:
            lines.append(f"- Last hour average: CPU {round(sum(s['cpu'] for s in samples)/len(samples))}%, RAM {round(sum(s['ram'] for s in samples)/len(samples))}% ({len(samples)} samples)")
    else:
        lines.append("- Monitoring agent: not installed on this computer (no live readings available)")
    alerts = await db.alerts.find({"computer_id": computer_id, "status": "active"}, {"_id": 0}).to_list(20)
    if alerts:
        lines.append("- Active alerts: " + "; ".join(
            f"{a['type'].replace('_', ' ')} since {_fmt_dt(a['started_at'])}" + (f" (now {a.get('value')}%)" if a.get("value") is not None else "")
            for a in alerts))
    reports = await db.reports.find({"computer_id": computer_id, "status": {"$in": ["Pending", "Assigned", "In Progress"]}}, {"_id": 0}).to_list(10)
    if reports:
        lines.append("- Open problem reports: " + "; ".join(f"#{r['report_number']} {r['problem_type']} ({r['status']}, {r['priority']})" for r in reports))
    history = await db.maintenance_records.find({"computer_id": computer_id}, {"_id": 0}).sort("date_fixed", -1).to_list(3)
    if history:
        lines.append("- Recent maintenance: " + "; ".join(f"{_fmt_dt(h['date_fixed'])[:6]} {h['diagnosis']} -> {h['action_taken']}" for h in history))
    return "\n".join(lines)


def split_report_marker(text: str):
    m = REPORT_RE.search(text)
    if not m:
        return text.strip(), None
    try:
        suggestion = json.loads(m.group(1))
    except json.JSONDecodeError:
        suggestion = None
    return REPORT_RE.sub("", text).strip(), suggestion


async def stream_reply(db, session: dict, history: list, user_text: str):
    context = await build_computer_context(db, session.get("computer_id"))
    initial = [{"role": "system", "content": SYSTEM_PROMPT + "\n" + context}]
    initial += [{"role": m["role"], "content": m["content"]} for m in history[-MAX_HISTORY:]]
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=session["id"], system_message="", initial_messages=initial)
    chat.with_model("openai", "gpt-5").with_params(reasoning_effort="low")
    full, buffer, holding = "", "", False
    async for ev in chat.stream_message(UserMessage(text=user_text)):
        if isinstance(ev, TextDelta):
            full += ev.content
            if holding:
                continue
            buffer += ev.content
            idx = buffer.find("<<")
            if idx != -1:
                holding = True
                if idx:
                    yield "delta", buffer[:idx]
                buffer = ""
            elif buffer.endswith("<"):
                continue
            else:
                yield "delta", buffer
                buffer = ""
        elif isinstance(ev, StreamDone):
            break
    if buffer and not holding:
        yield "delta", buffer
    clean, suggestion = split_report_marker(full)
    yield "done", {"content": clean, "suggestion": suggestion}


def new_message(session_id: str, role: str, content: str, suggestion=None) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": role,
        "content": content,
        "suggestion": suggestion,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
