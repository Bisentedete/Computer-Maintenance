"""Backend regression tests for CLMS re-test iteration 2.
Covers auth, reports CRUD, assign, maintenance -> computer status flip,
troubleshoot canned replies, and role gating.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tech-support-hub-141.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREDS = {
    "admin": ("admin@lab.edu", "admin123"),
    "tech": ("tech@lab.edu", "tech123"),
    "user": ("user@lab.edu", "user123"),
}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def tokens():
    out = {}
    for role, (e, p) in CREDS.items():
        out[role] = _login(e, p)
    return out


# ---------- Auth ----------
class TestAuth:
    def test_login_all_roles(self, tokens):
        for role in ("admin", "tech", "user"):
            d = tokens[role]
            assert "token" in d and d["user"]["email"] == CREDS[role][0]
            assert d["user"]["role"] in ("admin", "technician", "user")

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "x@lab.edu", "password": "bad"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, tokens):
        r = requests.get(f"{API}/auth/me", headers=_hdr(tokens["admin"]["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------- Stats ----------
class TestStats:
    def test_admin_stats(self, tokens):
        r = requests.get(f"{API}/stats", headers=_hdr(tokens["admin"]["token"]), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_computers", "operational", "pending_reports", "resolved_reports"):
            assert k in d
        assert d["total_computers"] >= 50

    def test_tech_stats(self, tokens):
        r = requests.get(f"{API}/stats/technician", headers=_hdr(tokens["tech"]["token"]), timeout=15)
        assert r.status_code == 200
        for k in ("assigned", "in_progress", "pending", "completed"):
            assert k in r.json()


# ---------- Reports flow ----------
class TestReportsFlow:
    def test_user_create_and_my_reports(self, tokens):
        tkn = tokens["user"]["token"]
        # create
        payload = {
            "computer_id": "PC-012",
            "problem_type": "Slow performance",
            "description": "TEST_desc " + uuid.uuid4().hex[:6],
        }
        r = requests.post(f"{API}/reports", json=payload, headers=_hdr(tkn), timeout=15)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        assert r.json()["status"] == "Pending"
        assert r.json()["computer_id"] == "PC-012"
        # GET lists mine
        r2 = requests.get(f"{API}/reports", headers=_hdr(tkn), timeout=15)
        assert r2.status_code == 200
        assert any(x["id"] == rid for x in r2.json())
        pytest.shared_report_id = rid

    def test_admin_assign_tech(self, tokens):
        # pick a pending report
        tkn = tokens["admin"]["token"]
        # find tech
        tr = requests.get(f"{API}/technicians", headers=_hdr(tkn), timeout=15)
        assert tr.status_code == 200
        techs = tr.json()
        assert techs
        tech_id = techs[0]["id"]
        rid = getattr(pytest, "shared_report_id", None)
        assert rid, "shared report id missing"
        r = requests.post(f"{API}/reports/{rid}/assign", json={"technician_id": tech_id},
                          headers=_hdr(tkn), timeout=15)
        assert r.status_code == 200, r.text
        # verify
        g = requests.get(f"{API}/reports/{rid}", headers=_hdr(tkn), timeout=15)
        assert g.status_code == 200
        assert g.json()["status"] == "Assigned"
        assert g.json()["assigned_technician_id"] == tech_id

    def test_maintenance_resolved_flips_computer(self, tokens):
        tkn = tokens["tech"]["token"]
        rid = getattr(pytest, "shared_report_id", None)
        payload = {
            "report_id": rid,
            "computer_id": "PC-012",
            "diagnosis": "TEST_diag",
            "damaged_part": "",
            "action_taken": "TEST_action",
            "status": "Resolved",
            "maintenance_type": "Hardware Maintenance",
        }
        r = requests.post(f"{API}/maintenance", json=payload, headers=_hdr(tkn), timeout=15)
        assert r.status_code == 200, r.text
        # computer status should be Operational
        c = requests.get(f"{API}/computers/PC-012", headers=_hdr(tkn), timeout=15)
        assert c.status_code == 200
        assert c.json()["status"] == "Operational"
        assert c.json()["condition"] == "Good"
        # report should be Resolved
        g = requests.get(f"{API}/reports/{rid}", headers=_hdr(tkn), timeout=15)
        assert g.json()["status"] == "Resolved"


# ---------- Role gating on API ----------
class TestRoleGating:
    def test_user_cannot_list_users(self, tokens):
        r = requests.get(f"{API}/users", headers=_hdr(tokens["user"]["token"]), timeout=15)
        assert r.status_code == 403

    def test_user_cannot_assign(self, tokens):
        r = requests.post(f"{API}/reports/anything/assign", json={"technician_id": "x"},
                          headers=_hdr(tokens["user"]["token"]), timeout=15)
        assert r.status_code == 403

    def test_tech_cannot_create_computer(self, tokens):
        r = requests.post(f"{API}/computers", json={"computer_id": "TEST_X", "laboratory": "L",
                                                     "processor": "p", "ram": "8", "storage": "1",
                                                     "operating_system": "Win"},
                          headers=_hdr(tokens["tech"]["token"]), timeout=15)
        assert r.status_code == 403


# ---------- Troubleshoot ----------
class TestTroubleshoot:
    def test_slow_canned(self, tokens):
        r = requests.post(f"{API}/troubleshoot", json={"message": "my computer is slow"},
                          headers=_hdr(tokens["user"]["token"]), timeout=15)
        assert r.status_code == 200
        reply = r.json()["reply"].lower()
        assert reply
        assert "restart" in reply or "report" in reply

    def test_default_canned(self, tokens):
        r = requests.post(f"{API}/troubleshoot", json={"message": "random gibberish xyz"},
                          headers=_hdr(tokens["user"]["token"]), timeout=15)
        assert r.status_code == 200
        assert "report" in r.json()["reply"].lower()
