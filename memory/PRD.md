# PRD — Computer Laboratory Maintenance System (CLMS)

## Original problem statement
Build a clean, professional, utilitarian web application called "Computer Laboratory Maintenance System" for managing the maintenance of computers in a school computer laboratory. Centralises computer records, status monitoring, problem reporting, maintenance requests, technician assignments, maintenance records/history, schedules, reports, and basic troubleshooting support. UI-first with mock data; AI/monitoring APIs deferred.

## Design direction (locked)
- IBM Plex Sans primary, IBM Plex Mono for computer IDs
- Palette: white/#F9FAFB surfaces, text #111827, accent #1E40AF (restrained blue)
- Semantic status colors used only on badges (green/amber/red/blue)
- No gradients, no glow, no large illustrations, no bouncy animations
- Dense data tables with zebra striping, sticky headers
- Sidebar (256 px white, border-right) + top header; collapsible menu on mobile

## Architecture (built on 2026-10-06)
- Backend: FastAPI (`/app/backend/server.py`), MongoDB via Motor, bcrypt + PyJWT auth
- Frontend: React 19, React-Router 7, Tailwind + shadcn/ui, Axios
- Auth: Bearer JWT in `localStorage['clms_token']`; `AuthProvider` + `Protected` route guard with role gating

## User personas
1. **Administrator** — oversees lab, assigns technicians, manages inventory & schedules, views reports
2. **Technician** — handles assigned maintenance, creates maintenance records
3. **User (student/faculty)** — reports problems, tracks own reports, uses troubleshooting chat

## What's implemented (2026-10-06)
- JWT login with 3 seeded demo accounts + 2 extra technicians + 2 users
- Admin Dashboard — stats + Recent Reports table + Computer Status Overview grid
- Technician Dashboard — stats + "My Tasks" table scoped to the signed-in tech
- User Dashboard — action tiles + My Recent Reports
- Computers inventory (search/filter), Add Computer (admin), Computer Details with placeholder monitoring metrics, Current Problem, Maintenance History
- Problem Reports (admin) list + Report Details with Assign Technician + Update Status/Priority
- Report a Problem form (shadcn Radix Select, native problem types, textarea + optional upload)
- Maintenance list with tabs (All/Pending/Assigned/In Progress/Resolved)
- Maintenance Record form (diagnosis/part/action/comment/preventive/status) → flips computer status when Resolved
- Maintenance History (searchable, filterable by type)
- Technicians page (specialization, availability, assigned/completed counts)
- Schedules page (list + create modal)
- Analytics (stats + common problems + top maintenance PCs)
- Users management (admin only)
- Troubleshooting chat (canned responses backend keyword-based)
- User Computer Status page (available / under maintenance / reported)
- Role-based routing, protected routes, responsive sidebar

## Seed data
- 6 users (1 admin / 3 technicians / 2 users)
- 50 computers (PC-001…PC-050) spread across Computer Lab 1/2/3
- 5 sample reports (Pending/Assigned/In Progress/Resolved mix)
- 3 completed maintenance records
- 4 upcoming schedules

## Backend endpoints (prefixed `/api`)
`POST /auth/login` · `GET /auth/me` · `GET /users` · `GET /technicians` · `GET /computers` · `GET /computers/{id}` · `POST /computers` · `GET /reports` · `GET /reports/{id}` · `POST /reports` · `POST /reports/{id}/assign` · `PATCH /reports/{id}` · `GET /maintenance` · `POST /maintenance` · `GET /schedules` · `POST /schedules` · `GET /stats` · `GET /stats/technician` · `POST /troubleshoot`

## Monitoring agent (implemented 2026-10-06)
- `POST /api/computers/{id}/telemetry` — header `X-Agent-Key` (= `AGENT_API_KEY` in backend .env); body cpu/ram/storage (0-100), hostname, os_name, uptime_seconds. Sets `last_heartbeat`.
- `online` derived server-side: heartbeat within 120 s → online; `monitoring` = `live` | `none`.
- `GET /api/agent/download` (admin/technician) — serves `/app/backend/agent.py` with server URL (Origin header or `PUBLIC_URL` env) and key pre-filled. Agent uses psutil, custom User-Agent (Cloudflare blocks python-urllib default), `python agent.py --id PC-001 [--interval 10]`.
- Computer Details page polls every 10 s; shows live / offline / no agent states + Monitoring Agent Setup card with download button.
- Tested: /app/test_reports/iteration_3.json (15/15 backend + UI pass).
- Fleet overview (2026-10-06): `/api/stats.fleet` {total, with_agent, online, offline, no_agent}; `OnlineDot` component; Computers list has Agent column, agent filter, coverage summary, 30 s polling; admin dashboard has Fleet Monitoring card + online dot in status grid. Self-tested via screenshot.

- Offline alerts (2026-10-06): `alerts` collection; background loop every 30 s raises an `offline` alert when `last_heartbeat` > 120 s old, auto-resolves on next telemetry push. `GET /api/alerts` (admin/tech) → {alerts, unread}; `POST /api/alerts/{id}/ack`; `POST /api/alerts/ack-all`. Per-user acknowledgements. Frontend: `AlertsBell` in header (unread badge, panel, dismiss/mark all), `/alerts` page with Active/Resolved tabs, sidebar link "Offline Alerts" for admin + technician. Self-tested via curl + screenshots.

## Backlog / next tasks
### P1 — real integrations
- Real AI troubleshooting via Emergent LLM key (Claude Sonnet) replacing canned responses
- Email offline alerts to technicians (Resend)

### P2 — productivity
- Email notifications (Resend) when a technician is assigned
- PDF export on the Analytics "Generate Report" button
- Calendar view on the Schedules page
- Image upload on Report a Problem (object storage integration)

### P3 — nice to have
- Reassign/un-assign action on reports
- Per-technician performance dashboard
- Bulk import of computers via CSV
- Audit log of status changes

## Known notes
- Troubleshooting is a mocked canned-reply endpoint by design (per user choice)
- Computer monitoring values come from the lab-PC agent; computers without an agent show "no agent" (seed values no longer displayed as live)
- CORS defaults to `*`; set an explicit origin before deploying to production
