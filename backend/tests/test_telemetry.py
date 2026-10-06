"""Tests for new telemetry feature + agent download + regression."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tech-support-hub-141.preview.emergentagent.com").rstrip("/")
AGENT_KEY = "clms-agent-key-7f3a9c2e"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@lab.edu", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def tech_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "tech@lab.edu", "password": "tech123"})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "user@lab.edu", "password": "user123"})
    assert r.status_code == 200
    return r.json()["token"]


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---- Telemetry ingest ----
class TestTelemetryIngest:
    def test_valid_push(self):
        payload = {"cpu_usage": 42.5, "ram_usage": 55, "storage_usage": 70, "hostname": "lab-pc1", "os_name": "Linux 6", "uptime_seconds": 3600}
        r = requests.post(f"{BASE_URL}/api/computers/PC-001/telemetry",
                          json=payload, headers={"X-Agent-Key": AGENT_KEY})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "received_at" in data

    def test_wrong_key(self):
        r = requests.post(f"{BASE_URL}/api/computers/PC-001/telemetry",
                          json={"cpu_usage": 10, "ram_usage": 10, "storage_usage": 10},
                          headers={"X-Agent-Key": "wrong"})
        assert r.status_code == 401

    def test_missing_key(self):
        r = requests.post(f"{BASE_URL}/api/computers/PC-001/telemetry",
                          json={"cpu_usage": 10, "ram_usage": 10, "storage_usage": 10})
        assert r.status_code == 401

    def test_unknown_computer(self):
        r = requests.post(f"{BASE_URL}/api/computers/PC-999/telemetry",
                          json={"cpu_usage": 10, "ram_usage": 10, "storage_usage": 10},
                          headers={"X-Agent-Key": AGENT_KEY})
        assert r.status_code == 404

    def test_out_of_range(self):
        r = requests.post(f"{BASE_URL}/api/computers/PC-001/telemetry",
                          json={"cpu_usage": 150, "ram_usage": 10, "storage_usage": 10},
                          headers={"X-Agent-Key": AGENT_KEY})
        assert r.status_code == 422


# ---- Get computer reflects telemetry ----
class TestGetComputerMonitoring:
    def test_live_after_push(self, admin_token):
        payload = {"cpu_usage": 73, "ram_usage": 61, "storage_usage": 55, "hostname": "live-host"}
        rp = requests.post(f"{BASE_URL}/api/computers/PC-001/telemetry", json=payload,
                           headers={"X-Agent-Key": AGENT_KEY})
        assert rp.status_code == 200
        r = requests.get(f"{BASE_URL}/api/computers/PC-001", headers=auth(admin_token))
        assert r.status_code == 200
        c = r.json()
        assert c["monitoring"] == "live"
        assert c["online"] is True
        assert c["cpu_usage"] == 73
        assert c["ram_usage"] == 61
        assert c["storage_usage"] == 55
        assert c.get("hostname") == "live-host"
        assert c.get("last_heartbeat")

    def test_no_telemetry_pc(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/computers/PC-050", headers=auth(admin_token))
        assert r.status_code == 200
        c = r.json()
        assert c["monitoring"] == "none"
        assert c["online"] is False
        assert not c.get("last_heartbeat")

    def test_list_includes_fields(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/computers", headers=auth(admin_token))
        assert r.status_code == 200
        comps = r.json()
        assert len(comps) > 0
        for c in comps[:5]:
            assert "monitoring" in c
            assert "online" in c


# ---- Agent download ----
class TestAgentDownload:
    def test_admin_download(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/agent/download", headers=auth(admin_token))
        assert r.status_code == 200
        assert "attachment" in r.headers.get("content-disposition", "").lower()
        assert "agent.py" in r.headers.get("content-disposition", "")
        body = r.text
        assert "__SERVER_URL__" not in body
        assert "__AGENT_KEY__" not in body
        assert AGENT_KEY in body
        # server url substituted
        assert "http" in body

    def test_tech_download(self, tech_token):
        r = requests.get(f"{BASE_URL}/api/agent/download", headers=auth(tech_token))
        assert r.status_code == 200

    def test_user_forbidden(self, user_token):
        r = requests.get(f"{BASE_URL}/api/agent/download", headers=auth(user_token))
        assert r.status_code == 403

    def test_no_token(self):
        r = requests.get(f"{BASE_URL}/api/agent/download")
        assert r.status_code == 401


# ---- Regression ----
class TestRegression:
    def test_stats(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/stats", headers=auth(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "total_computers" in d

    def test_reports_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/reports", headers=auth(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_computers_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/computers", headers=auth(admin_token))
        assert r.status_code == 200
        assert len(r.json()) >= 50
