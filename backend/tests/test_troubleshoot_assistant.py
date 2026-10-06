"""Tests for the AI Troubleshooting Assistant (sessions + SSE)."""
import json
import os
import re
import time

import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].splitlines()[0]).rstrip("/")
API = f"{BASE_URL}/api"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"] if "access_token" in r.json() else r.json().get("token")


@pytest.fixture(scope="module")
def user_token():
    return _login("user@lab.edu", "user123")


@pytest.fixture(scope="module")
def other_token():
    return _login("tech@lab.edu", "tech123")


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


def _stream_message(sess_id, token, text, computer_id=None, timeout=90):
    url = f"{API}/troubleshoot/sessions/{sess_id}/messages"
    body = {"message": text, "computer_id": computer_id or ""}
    deltas = []
    done_payload = None
    with requests.post(url, json=body, headers=_hdr(token), stream=True, timeout=timeout) as r:
        assert r.status_code == 200, f"stream failed {r.status_code}: {r.text[:300]}"
        assert "text/event-stream" in r.headers.get("content-type", ""), r.headers
        start = time.time()
        for raw in r.iter_lines(decode_unicode=True):
            if time.time() - start > timeout:
                break
            if raw is None:
                continue
            if raw.startswith(":"):
                continue  # keepalive comment
            if not raw.startswith("data: "):
                continue
            ev = json.loads(raw[6:])
            if ev["type"] == "delta":
                deltas.append(ev["content"])
            elif ev["type"] == "done":
                done_payload = ev["message"]
                break
            elif ev["type"] == "error":
                pytest.fail(f"stream error: {ev}")
    assert done_payload is not None, "did not receive done event"
    return deltas, done_payload


# ---------- Session CRUD ----------
class TestSessionCrud:
    def test_create_list_isolation_and_delete(self, user_token, other_token):
        # user creates a session
        r = requests.post(f"{API}/troubleshoot/sessions", json={"computer_id": "PC-003"}, headers=_hdr(user_token), timeout=10)
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["computer_id"] == "PC-003"
        assert s["title"] == "New conversation"
        assert "id" in s
        sid = s["id"]

        # list returns the session for user
        r = requests.get(f"{API}/troubleshoot/sessions", headers=_hdr(user_token), timeout=10)
        assert r.status_code == 200
        assert any(x["id"] == sid for x in r.json())

        # other user cannot see it
        r = requests.get(f"{API}/troubleshoot/sessions", headers=_hdr(other_token), timeout=10)
        assert r.status_code == 200
        assert not any(x["id"] == sid for x in r.json())

        # messages endpoint for other -> 404
        r = requests.get(f"{API}/troubleshoot/sessions/{sid}/messages", headers=_hdr(other_token), timeout=10)
        assert r.status_code == 404

        # owner messages endpoint -> session + empty messages
        r = requests.get(f"{API}/troubleshoot/sessions/{sid}/messages", headers=_hdr(user_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["session"]["id"] == sid
        assert data["messages"] == []

        # delete and verify gone
        r = requests.delete(f"{API}/troubleshoot/sessions/{sid}", headers=_hdr(user_token), timeout=10)
        assert r.status_code == 200
        r = requests.get(f"{API}/troubleshoot/sessions/{sid}/messages", headers=_hdr(user_token), timeout=10)
        assert r.status_code == 404

    def test_empty_message_returns_400(self, user_token):
        r = requests.post(f"{API}/troubleshoot/sessions", json={"computer_id": None}, headers=_hdr(user_token), timeout=10)
        sid = r.json()["id"]
        try:
            r = requests.post(f"{API}/troubleshoot/sessions/{sid}/messages",
                              json={"message": "   ", "computer_id": ""},
                              headers=_hdr(user_token), timeout=15)
            assert r.status_code == 400, r.text
        finally:
            requests.delete(f"{API}/troubleshoot/sessions/{sid}", headers=_hdr(user_token), timeout=10)


# ---------- SSE streaming + context + suggestion + multi-turn ----------
class TestAssistantStreaming:
    def test_live_context_and_persistence(self, user_token):
        # Create session with PC-003 (which has active alerts/telemetry per seed)
        r = requests.post(f"{API}/troubleshoot/sessions", json={"computer_id": "PC-003"}, headers=_hdr(user_token), timeout=10)
        sid = r.json()["id"]
        try:
            text = "PC-003 is really slow today, pages take forever to load. What should I check?"
            deltas, done = _stream_message(sid, user_token, text, "PC-003", timeout=90)
            assert len(deltas) >= 1, "expected at least one delta event"
            full = done["content"]
            assert full and len(full) > 10
            assert done["role"] == "assistant"
            assert "<<REPORT" not in full, "marker leaked to visible content"
            # Context should mention PC-003 or a numeric reading
            assert ("PC-003" in full) or re.search(r"\d{1,3}\s*%", full), f"no context reference in reply: {full[:300]}"

            # Second turn (multi-turn history)
            deltas2, done2 = _stream_message(sid, user_token, "I already restarted it, same thing.", "PC-003", timeout=90)
            assert done2["content"] and done2["content"] != full

            # Both user & assistant messages persisted; title updated to first user text (prefix)
            r = requests.get(f"{API}/troubleshoot/sessions/{sid}/messages", headers=_hdr(user_token), timeout=10)
            assert r.status_code == 200
            data = r.json()
            msgs = data["messages"]
            roles = [m["role"] for m in msgs]
            assert roles.count("user") == 2
            assert roles.count("assistant") == 2
            # Session title should be derived from first user message
            assert data["session"]["title"].startswith("PC-003 is really slow"), data["session"]["title"]
            # updated_at bumped (not equal to created_at)
            assert data["session"]["updated_at"] >= data["session"]["created_at"]
        finally:
            requests.delete(f"{API}/troubleshoot/sessions/{sid}", headers=_hdr(user_token), timeout=10)

    def test_hardware_problem_produces_suggestion(self, user_token):
        r = requests.post(f"{API}/troubleshoot/sessions", json={"computer_id": "PC-012"}, headers=_hdr(user_token), timeout=10)
        sid = r.json()["id"]
        try:
            text = ("PC-012 will not power on at all. No lights, no fan, totally dead. "
                    "I tried two different wall outlets and a different power cable, nothing happens.")
            deltas, done = _stream_message(sid, user_token, text, "PC-012", timeout=90)
            full = done["content"]
            assert "<<REPORT" not in full
            sug = done.get("suggestion")
            assert sug is not None, f"expected suggestion for hardware failure, got reply: {full[:300]}"
            assert isinstance(sug, dict)
            assert "problem_type" in sug and "description" in sug
            allowed = {
                "Computer won't turn on", "Slow performance", "Keyboard problem", "Mouse problem",
                "Monitor/display problem", "Network/internet problem", "Software problem",
                "Virus/malware concern", "Printer problem", "Other",
            }
            assert sug["problem_type"] in allowed, sug
        finally:
            requests.delete(f"{API}/troubleshoot/sessions/{sid}", headers=_hdr(user_token), timeout=10)
