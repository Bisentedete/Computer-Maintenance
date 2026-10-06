from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---- DB ----
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
AGENT_API_KEY = os.environ["AGENT_API_KEY"]
OFFLINE_AFTER_SECONDS = 120
HIGH_USAGE_PCT = 90
HIGH_USAGE_CLEAR_PCT = 80
HIGH_USAGE_WINDOW_MINUTES = 5
HIGH_USAGE_MIN_SAMPLES = 3

app = FastAPI(title="Computer Laboratory Maintenance System")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("clms")


# ---- helpers ----
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def apply_liveness(c: dict) -> dict:
    hb = c.get("last_heartbeat")
    if not hb:
        c["online"] = False
        c["monitoring"] = "none"
        return c
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(hb)).total_seconds()
    c["online"] = age <= OFFLINE_AFTER_SECONDS
    c["monitoring"] = "live"
    return c


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    token = creds.credentials if creds else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


# ---- Models ----
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProblemReportIn(BaseModel):
    computer_id: str
    problem_type: str
    description: str
    additional_details: Optional[str] = ""


class AssignTechIn(BaseModel):
    technician_id: str


class UpdateReportIn(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None


class MaintenanceRecordIn(BaseModel):
    report_id: str
    computer_id: str
    diagnosis: str
    damaged_part: Optional[str] = ""
    action_taken: str
    technician_comment: Optional[str] = ""
    preventive_suggestion: Optional[str] = ""
    status: Literal["In Progress", "Resolved"]
    maintenance_type: Optional[str] = "Hardware Maintenance"


class ComputerIn(BaseModel):
    computer_id: str
    laboratory: str
    processor: str
    ram: str
    storage: str
    operating_system: str
    condition: Optional[str] = "Good"
    status: Optional[str] = "Operational"


class ScheduleIn(BaseModel):
    computer_id: str
    maintenance_type: str
    technician_id: str
    scheduled_date: str
    notes: Optional[str] = ""


class ChatIn(BaseModel):
    message: str


class TelemetryIn(BaseModel):
    cpu_usage: float = Field(ge=0, le=100)
    ram_usage: float = Field(ge=0, le=100)
    storage_usage: float = Field(ge=0, le=100)
    hostname: Optional[str] = None
    os_name: Optional[str] = None
    uptime_seconds: Optional[int] = None


# ---- Auth routes ----
@api.post("/auth/login")
async def login(data: LoginIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {k: user[k] for k in ("id", "email", "name", "role")},
    }


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---- Users / Technicians ----
@api.get("/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@api.get("/technicians")
async def list_technicians(user: dict = Depends(get_current_user)):
    techs = await db.users.find({"role": "technician"}, {"_id": 0, "password_hash": 0}).to_list(200)
    # augment with task counts
    for t in techs:
        t["assigned_tasks"] = await db.reports.count_documents(
            {"assigned_technician_id": t["id"], "status": {"$in": ["Assigned", "In Progress"]}}
        )
        t["completed_tasks"] = await db.maintenance_records.count_documents(
            {"technician_id": t["id"], "status": "Resolved"}
        )
    return techs


# ---- Computers ----
@api.get("/computers")
async def list_computers(user: dict = Depends(get_current_user)):
    comps = await db.computers.find({}, {"_id": 0}).sort("computer_id", 1).to_list(1000)
    return [apply_liveness(c) for c in comps]


@api.get("/agent/download", response_class=PlainTextResponse)
async def download_agent(request: Request, user: dict = Depends(require_roles("admin", "technician"))):
    src = (ROOT_DIR / "agent.py").read_text()
    server_url = os.environ.get("PUBLIC_URL") or request.headers.get("origin") or str(request.base_url).rstrip("/")
    src = src.replace("__SERVER_URL__", server_url).replace("__AGENT_KEY__", AGENT_API_KEY)
    return PlainTextResponse(src, headers={"Content-Disposition": "attachment; filename=agent.py"})


@api.post("/computers/{computer_id}/telemetry")
async def ingest_telemetry(computer_id: str, data: TelemetryIn, x_agent_key: str = Header(default="")):
    if x_agent_key != AGENT_API_KEY:
        raise HTTPException(401, "Invalid agent key")
    update = {
        "cpu_usage": round(data.cpu_usage),
        "ram_usage": round(data.ram_usage),
        "storage_usage": round(data.storage_usage),
        "last_heartbeat": now_iso(),
        "last_check": now_iso(),
    }
    if data.hostname:
        update["hostname"] = data.hostname
    if data.os_name:
        update["agent_os"] = data.os_name
    if data.uptime_seconds is not None:
        update["uptime_seconds"] = data.uptime_seconds
    res = await db.computers.update_one({"computer_id": computer_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Computer not found")
    await db.telemetry_samples.insert_one({
        "computer_id": computer_id,
        "ts": datetime.now(timezone.utc),
        "cpu": update["cpu_usage"],
        "ram": update["ram_usage"],
    })
    await resolve_offline_alert(computer_id)
    return {"ok": True, "received_at": update["last_heartbeat"]}


@api.get("/computers/{computer_id}/telemetry/history")
async def telemetry_history(computer_id: str, user: dict = Depends(get_current_user)):
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    cur = db.telemetry_samples.find(
        {"computer_id": computer_id, "ts": {"$gte": since}}, {"_id": 0, "ts": 1, "cpu": 1, "ram": 1}
    ).sort("ts", 1)
    samples = [{"ts": s["ts"].replace(tzinfo=timezone.utc).isoformat(), "cpu": s["cpu"], "ram": s["ram"]} async for s in cur]
    return {"computer_id": computer_id, "samples": samples}


# ---- Offline alerts ----
async def resolve_offline_alert(computer_id: str):
    await db.alerts.update_many(
        {"computer_id": computer_id, "type": "offline", "status": "active"},
        {"$set": {"status": "resolved", "resolved_at": now_iso()}},
    )


async def check_offline_computers():
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=OFFLINE_AFTER_SECONDS)).isoformat()
    async for c in db.computers.find({"last_heartbeat": {"$exists": True, "$lt": cutoff}}, {"_id": 0, "computer_id": 1, "laboratory": 1, "last_heartbeat": 1}):
        exists = await db.alerts.find_one({"computer_id": c["computer_id"], "type": "offline", "status": "active"})
        if exists:
            continue
        await db.alerts.insert_one({
            "id": str(uuid.uuid4()),
            "type": "offline",
            "computer_id": c["computer_id"],
            "laboratory": c.get("laboratory"),
            "status": "active",
            "last_heartbeat_at": c["last_heartbeat"],
            "started_at": now_iso(),
            "resolved_at": None,
            "acknowledged_by": [],
        })
        logger.info(f"Offline alert raised for {c['computer_id']}")
    async for a in db.alerts.find({"type": "offline", "status": "active"}, {"_id": 0, "id": 1, "computer_id": 1}):
        comp = await db.computers.find_one({"computer_id": a["computer_id"]}, {"_id": 0, "last_heartbeat": 1})
        if comp and comp.get("last_heartbeat", "") >= cutoff:
            await resolve_offline_alert(a["computer_id"])


async def check_high_usage():
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=OFFLINE_AFTER_SECONDS)).isoformat()
    window = datetime.now(timezone.utc) - timedelta(minutes=HIGH_USAGE_WINDOW_MINUTES)
    async for c in db.computers.find({"last_heartbeat": {"$gte": cutoff}}, {"_id": 0, "computer_id": 1, "laboratory": 1}):
        samples = await db.telemetry_samples.find(
            {"computer_id": c["computer_id"], "ts": {"$gte": window}}, {"_id": 0, "cpu": 1, "ram": 1}
        ).sort("ts", 1).to_list(1000)
        if not samples:
            continue
        for metric in ("cpu", "ram"):
            atype = f"high_{metric}"
            latest = samples[-1][metric]
            active = await db.alerts.find_one({"computer_id": c["computer_id"], "type": atype, "status": "active"})
            if active:
                if latest < HIGH_USAGE_CLEAR_PCT:
                    await db.alerts.update_one({"id": active["id"]}, {"$set": {"status": "resolved", "resolved_at": now_iso(), "value": latest}})
                else:
                    await db.alerts.update_one({"id": active["id"]}, {"$set": {"value": latest, "peak": max(active.get("peak", 0), latest)}})
                continue
            if len(samples) >= HIGH_USAGE_MIN_SAMPLES and all(s[metric] >= HIGH_USAGE_PCT for s in samples):
                await db.alerts.insert_one({
                    "id": str(uuid.uuid4()),
                    "type": atype,
                    "metric": metric,
                    "computer_id": c["computer_id"],
                    "laboratory": c.get("laboratory"),
                    "status": "active",
                    "value": latest,
                    "peak": max(s[metric] for s in samples),
                    "started_at": now_iso(),
                    "resolved_at": None,
                    "acknowledged_by": [],
                })
                logger.info(f"High {metric.upper()} alert raised for {c['computer_id']} ({latest}%)")


async def offline_monitor_loop():
    while True:
        try:
            await check_offline_computers()
            await check_high_usage()
        except Exception as e:
            logger.warning(f"monitor check failed: {e}")
        await asyncio.sleep(30)


def alert_view(a: dict, user_id: str) -> dict:
    a["acknowledged"] = user_id in a.get("acknowledged_by", [])
    a.pop("acknowledged_by", None)
    return a


@api.get("/alerts")
async def list_alerts(status: Optional[str] = None, user: dict = Depends(require_roles("admin", "technician"))):
    q = {"status": status} if status else {}
    alerts = await db.alerts.find(q, {"_id": 0}).sort("started_at", -1).to_list(200)
    items = [alert_view(a, user["id"]) for a in alerts]
    unread = sum(1 for a in items if a["status"] == "active" and not a["acknowledged"])
    return {"alerts": items, "unread": unread}


@api.post("/alerts/{alert_id}/ack")
async def ack_alert(alert_id: str, user: dict = Depends(require_roles("admin", "technician"))):
    res = await db.alerts.update_one({"id": alert_id}, {"$addToSet": {"acknowledged_by": user["id"]}})
    if res.matched_count == 0:
        raise HTTPException(404, "Alert not found")
    return {"ok": True}


@api.post("/alerts/ack-all")
async def ack_all_alerts(user: dict = Depends(require_roles("admin", "technician"))):
    await db.alerts.update_many({"status": "active"}, {"$addToSet": {"acknowledged_by": user["id"]}})
    return {"ok": True}


@api.get("/computers/{computer_id}")
async def get_computer(computer_id: str, user: dict = Depends(get_current_user)):
    c = await db.computers.find_one({"computer_id": computer_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Computer not found")
    # current problem
    cp = await db.reports.find_one(
        {"computer_id": computer_id, "status": {"$in": ["Pending", "Assigned", "In Progress"]}},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    history = await db.maintenance_records.find({"computer_id": computer_id}, {"_id": 0}).sort("date_fixed", -1).to_list(100)
    c["current_problem"] = cp
    c["maintenance_history"] = history
    return apply_liveness(c)


@api.post("/computers")
async def create_computer(data: ComputerIn, user: dict = Depends(require_roles("admin"))):
    exists = await db.computers.find_one({"computer_id": data.computer_id})
    if exists:
        raise HTTPException(400, "Computer ID already exists")
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["last_maintenance"] = now_iso()
    doc["created_at"] = now_iso()
    # placeholder monitoring values
    doc["online"] = True
    doc["cpu_usage"] = 25
    doc["ram_usage"] = 48
    doc["storage_usage"] = 60
    doc["last_check"] = now_iso()
    await db.computers.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---- Problem reports ----
@api.get("/reports")
async def list_reports(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    computer_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = {}
    if user["role"] == "user":
        q["reported_by_id"] = user["id"]
    elif user["role"] == "technician":
        q["$or"] = [{"assigned_technician_id": user["id"]}, {"reported_by_id": user["id"]}]
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    if computer_id:
        q["computer_id"] = computer_id
    reports = await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reports


@api.get("/reports/{report_id}")
async def get_report(report_id: str, user: dict = Depends(get_current_user)):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Report not found")
    return r


@api.post("/reports")
async def create_report(data: ProblemReportIn, user: dict = Depends(get_current_user)):
    comp = await db.computers.find_one({"computer_id": data.computer_id})
    if not comp:
        raise HTTPException(400, "Computer not found")
    count = await db.reports.count_documents({})
    doc = {
        "id": str(uuid.uuid4()),
        "report_number": 100 + count + 1,
        "computer_id": data.computer_id,
        "problem_type": data.problem_type,
        "description": data.description,
        "additional_details": data.additional_details,
        "reported_by_id": user["id"],
        "reported_by_name": user["name"],
        "priority": "Medium",
        "status": "Pending",
        "assigned_technician_id": None,
        "assigned_technician_name": None,
        "created_at": now_iso(),
    }
    await db.reports.insert_one(doc)
    await db.computers.update_one(
        {"computer_id": data.computer_id},
        {"$set": {"status": "Reported Problem"}},
    )
    doc.pop("_id", None)
    return doc


@api.post("/reports/{report_id}/assign")
async def assign_report(report_id: str, data: AssignTechIn, user: dict = Depends(require_roles("admin"))):
    tech = await db.users.find_one({"id": data.technician_id, "role": "technician"})
    if not tech:
        raise HTTPException(400, "Technician not found")
    r = await db.reports.find_one_and_update(
        {"id": report_id},
        {"$set": {
            "assigned_technician_id": tech["id"],
            "assigned_technician_name": tech["name"],
            "status": "Assigned",
        }},
        return_document=True,
    )
    if not r:
        raise HTTPException(404, "Report not found")
    return {"ok": True}


@api.patch("/reports/{report_id}")
async def update_report(report_id: str, data: UpdateReportIn, user: dict = Depends(require_roles("admin", "technician"))):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update:
        return {"ok": True}
    await db.reports.update_one({"id": report_id}, {"$set": update})
    return {"ok": True}


# ---- Maintenance records ----
@api.get("/maintenance")
async def list_maintenance(
    status: Optional[str] = None,
    computer_id: Optional[str] = None,
    technician_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = {}
    if user["role"] == "technician":
        q["technician_id"] = user["id"]
    if status:
        q["status"] = status
    if computer_id:
        q["computer_id"] = computer_id
    if technician_id:
        q["technician_id"] = technician_id
    recs = await db.maintenance_records.find(q, {"_id": 0}).sort("date_fixed", -1).to_list(500)
    return recs


@api.post("/maintenance")
async def create_maintenance(data: MaintenanceRecordIn, user: dict = Depends(require_roles("technician", "admin"))):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["technician_id"] = user["id"]
    doc["technician_name"] = user["name"]
    doc["date_fixed"] = now_iso()
    await db.maintenance_records.insert_one(doc)
    # update report
    report_status = "Resolved" if data.status == "Resolved" else "In Progress"
    await db.reports.update_one({"id": data.report_id}, {"$set": {"status": report_status}})
    # update computer
    comp_status = "Operational" if data.status == "Resolved" else "Under Maintenance"
    comp_condition = "Good" if data.status == "Resolved" else "Needs Repair"
    await db.computers.update_one(
        {"computer_id": data.computer_id},
        {"$set": {"status": comp_status, "condition": comp_condition, "last_maintenance": now_iso()}},
    )
    doc.pop("_id", None)
    return doc


# ---- Schedules ----
@api.get("/schedules")
async def list_schedules(user: dict = Depends(get_current_user)):
    s = await db.schedules.find({}, {"_id": 0}).sort("scheduled_date", 1).to_list(500)
    return s


@api.post("/schedules")
async def create_schedule(data: ScheduleIn, user: dict = Depends(require_roles("admin"))):
    tech = await db.users.find_one({"id": data.technician_id})
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["technician_name"] = tech["name"] if tech else "Unassigned"
    doc["status"] = "Scheduled"
    doc["created_at"] = now_iso()
    await db.schedules.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---- Dashboard stats ----
@api.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    total = await db.computers.count_documents({})
    operational = await db.computers.count_documents({"status": "Operational"})
    under_maintenance = await db.computers.count_documents({"status": "Under Maintenance"})
    reported = await db.computers.count_documents({"status": "Reported Problem"})
    pending = await db.reports.count_documents({"status": "Pending"})
    in_progress = await db.reports.count_documents({"status": "In Progress"})
    resolved = await db.reports.count_documents({"status": "Resolved"})
    total_reports = await db.reports.count_documents({})

    # most common problem types
    pipeline = [
        {"$group": {"_id": "$problem_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 6},
    ]
    common_problems = [{"name": d["_id"], "count": d["count"]} async for d in db.reports.aggregate(pipeline)]

    # computers with most maintenance
    pc_pipe = [
        {"$group": {"_id": "$computer_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 6},
    ]
    top_pcs = [{"computer_id": d["_id"], "count": d["count"]} async for d in db.maintenance_records.aggregate(pc_pipe)]

    comps = [apply_liveness(c) async for c in db.computers.find({}, {"_id": 0, "monitoring": 1, "last_heartbeat": 1})]
    with_agent = sum(1 for c in comps if c["monitoring"] == "live")
    online = sum(1 for c in comps if c["online"])

    return {
        "fleet": {
            "total": total,
            "with_agent": with_agent,
            "online": online,
            "offline": with_agent - online,
            "no_agent": total - with_agent,
        },
        "total_computers": total,
        "operational": operational,
        "under_maintenance": under_maintenance,
        "reported_problems": reported,
        "pending_reports": pending,
        "in_progress_reports": in_progress,
        "resolved_reports": resolved,
        "total_reports": total_reports,
        "common_problems": common_problems,
        "top_maintenance_computers": top_pcs,
    }


@api.get("/stats/technician")
async def tech_stats(user: dict = Depends(require_roles("technician"))):
    assigned = await db.reports.count_documents({"assigned_technician_id": user["id"], "status": "Assigned"})
    in_progress = await db.reports.count_documents({"assigned_technician_id": user["id"], "status": "In Progress"})
    pending = await db.reports.count_documents({"assigned_technician_id": user["id"], "status": "Pending"})
    completed = await db.maintenance_records.count_documents({"technician_id": user["id"], "status": "Resolved"})
    return {"assigned": assigned, "in_progress": in_progress, "pending": pending, "completed": completed}


# ---- Troubleshooting (static canned responses) ----
CANNED = {
    "slow": "Try restarting the computer and closing applications you aren't using. Check if any background updates are running. If the problem continues, you may submit a maintenance report.",
    "turn on": "First, check that the power cable is firmly connected and the outlet is working. Try a different outlet. If the computer still won't turn on, please submit a maintenance report so a technician can inspect the power supply.",
    "internet": "Check if the ethernet cable is connected on both ends. Try disabling and re-enabling the network connection. If other computers in the lab can connect, submit a report for this specific unit.",
    "keyboard": "Unplug and reconnect the keyboard. Try a different USB port. If keys are still unresponsive or stuck, submit a maintenance report.",
    "mouse": "Unplug and reconnect the mouse. Try a different USB port. If the pointer still won't move, submit a maintenance report.",
    "monitor": "Check that the monitor power and display cables are secure. Try adjusting the brightness. If the screen is still black or distorted, submit a maintenance report.",
    "virus": "Avoid opening unknown files or downloads. Run the installed anti-virus scan. Please submit a maintenance report so a technician can inspect the system.",
    "printer": "Check the printer power and USB/network connection. Verify there is paper and ink. If printing still fails, submit a maintenance report.",
}


@api.post("/troubleshoot")
async def troubleshoot(data: ChatIn, user: dict = Depends(get_current_user)):
    msg = data.message.lower()
    for key, resp in CANNED.items():
        if key in msg:
            return {"reply": resp}
    return {"reply": "Thanks for the details. Try restarting the computer first. If the issue continues, please submit a maintenance report so a laboratory technician can take a look."}


# ---- Seed ----
async def seed():
    await db.users.create_index("email", unique=True)
    await db.computers.create_index("computer_id", unique=True)
    await db.telemetry_samples.create_index("ts", expireAfterSeconds=24 * 3600)
    await db.telemetry_samples.create_index([("computer_id", 1), ("ts", 1)])

    seed_users = [
        ("admin@lab.edu", "admin123", "Carlos Mendoza", "admin", None),
        ("tech@lab.edu", "tech123", "Pedro Santos", "technician", "Hardware"),
        ("tech2@lab.edu", "tech123", "Maria Reyes", "technician", "Network"),
        ("tech3@lab.edu", "tech123", "Luis Garcia", "technician", "Software"),
        ("user@lab.edu", "user123", "Juan Dela Cruz", "user", None),
        ("faculty@lab.edu", "user123", "Prof. Ana Villanueva", "user", None),
    ]
    for email, pw, name, role, spec in seed_users:
        existing = await db.users.find_one({"email": email})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "role": role,
                "specialization": spec,
                "availability": "Available",
                "password_hash": hash_password(pw),
                "created_at": now_iso(),
            })

    # Computers
    if await db.computers.count_documents({}) == 0:
        labs = ["Computer Lab 1", "Computer Lab 2", "Computer Lab 3"]
        comps = []
        for i in range(1, 51):
            lab = labs[(i - 1) // 17 % 3]
            comps.append({
                "id": str(uuid.uuid4()),
                "computer_id": f"PC-{i:03d}",
                "laboratory": lab,
                "processor": "Intel Core i5-12400",
                "ram": "8 GB DDR4",
                "storage": "256 GB SSD",
                "operating_system": "Windows 11 Pro",
                "condition": "Good",
                "status": "Operational",
                "last_maintenance": now_iso(),
                "created_at": now_iso(),
                "online": True,
                "cpu_usage": 20 + (i % 40),
                "ram_usage": 35 + (i % 30),
                "storage_usage": 40 + (i % 40),
                "last_check": now_iso(),
            })
        # set a few into special statuses
        comps[2]["status"] = "Under Maintenance"
        comps[2]["condition"] = "Needs Repair"
        comps[14]["status"] = "Reported Problem"
        comps[23]["status"] = "Under Maintenance"
        comps[30]["status"] = "Reported Problem"
        comps[42]["status"] = "Under Maintenance"
        comps[46]["status"] = "Under Maintenance"
        await db.computers.insert_many(comps)

    # Reports
    if await db.reports.count_documents({}) == 0:
        user = await db.users.find_one({"email": "user@lab.edu"})
        tech = await db.users.find_one({"email": "tech@lab.edu"})
        samples = [
            ("PC-012", "Computer won't turn on", "Won't turn on", "High", "Pending", user, None),
            ("PC-024", "Slow performance", "Takes very long to open applications.", "Medium", "In Progress", user, tech),
            ("PC-031", "No internet", "Cannot connect to the lab network.", "Medium", "Resolved", user, tech),
            ("PC-015", "Keyboard problem", "Several keys are not responding.", "Low", "Assigned", user, tech),
            ("PC-003", "Monitor/display problem", "Screen flickers intermittently.", "High", "In Progress", user, tech),
        ]
        for idx, (pc, ptype, desc, pri, stat, u, t) in enumerate(samples):
            await db.reports.insert_one({
                "id": str(uuid.uuid4()),
                "report_number": 101 + idx,
                "computer_id": pc,
                "problem_type": ptype,
                "description": desc,
                "additional_details": "",
                "reported_by_id": u["id"],
                "reported_by_name": u["name"],
                "priority": pri,
                "status": stat,
                "assigned_technician_id": t["id"] if t else None,
                "assigned_technician_name": t["name"] if t else None,
                "created_at": now_iso(),
            })

    # Maintenance records (completed samples)
    if await db.maintenance_records.count_documents({}) == 0:
        tech = await db.users.find_one({"email": "tech@lab.edu"})
        tech2 = await db.users.find_one({"email": "tech2@lab.edu"})
        samples = [
            ("PC-031", "Faulty network cable", "RJ45 Cable", "Replaced network cable", "Resolved", tech2, "Network Maintenance"),
            ("PC-005", "Dust buildup in fan", "N/A", "Cleaned internal fans", "Resolved", tech, "Preventive Maintenance"),
            ("PC-018", "Corrupted OS files", "N/A", "Reinstalled operating system", "Resolved", tech, "Software Maintenance"),
        ]
        for pc, diag, part, action, stat, t, mtype in samples:
            await db.maintenance_records.insert_one({
                "id": str(uuid.uuid4()),
                "report_id": "legacy",
                "computer_id": pc,
                "diagnosis": diag,
                "damaged_part": part,
                "action_taken": action,
                "technician_comment": "Verified operation after service.",
                "preventive_suggestion": "Schedule regular inspection.",
                "status": stat,
                "maintenance_type": mtype,
                "technician_id": t["id"],
                "technician_name": t["name"],
                "date_fixed": now_iso(),
            })

    # Schedules
    if await db.schedules.count_documents({}) == 0:
        tech = await db.users.find_one({"email": "tech@lab.edu"})
        base = datetime.now(timezone.utc)
        for i, (pc, mtype) in enumerate([
            ("PC-001", "Preventive Maintenance"),
            ("PC-010", "Hardware Maintenance"),
            ("PC-020", "Software Maintenance"),
            ("PC-035", "General Inspection"),
        ]):
            await db.schedules.insert_one({
                "id": str(uuid.uuid4()),
                "computer_id": pc,
                "maintenance_type": mtype,
                "technician_id": tech["id"],
                "technician_name": tech["name"],
                "scheduled_date": (base + timedelta(days=3 * (i + 1))).isoformat(),
                "status": "Scheduled",
                "notes": "",
                "created_at": now_iso(),
            })

    # Write test credentials file
    try:
        mem = Path("/app/memory")
        mem.mkdir(exist_ok=True)
        (mem / "test_credentials.md").write_text(
            "# Test Credentials\n\n"
            "## Admin\n- Email: admin@lab.edu\n- Password: admin123\n\n"
            "## Technician\n- Email: tech@lab.edu\n- Password: tech123\n\n"
            "## User (Student/Faculty)\n- Email: user@lab.edu\n- Password: user123\n\n"
            "## Auth endpoints\n- POST /api/auth/login { email, password }\n- GET /api/auth/me (Bearer token)\n"
        )
    except Exception as e:
        logger.warning(f"Could not write test_credentials.md: {e}")


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    await seed()
    asyncio.create_task(offline_monitor_loop())
    logger.info("CLMS backend ready.")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
