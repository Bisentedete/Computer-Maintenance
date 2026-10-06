#!/usr/bin/env python3
"""CLMS lab-PC monitoring agent. Usage: python agent.py --id PC-001 [--interval 10]"""
import argparse
import json
import platform
import socket
import sys
import time
import urllib.request

try:
    import psutil
except ImportError:
    sys.exit("psutil is required: pip install psutil")


def collect():
    disk = psutil.disk_usage("/")
    return {
        "cpu_usage": round(psutil.cpu_percent(interval=1)),
        "ram_usage": round(psutil.virtual_memory().percent),
        "storage_usage": round(disk.percent),
        "hostname": socket.gethostname(),
        "os_name": f"{platform.system()} {platform.release()}",
        "uptime_seconds": int(time.time() - psutil.boot_time()),
    }


def push(server, api_key, computer_id, payload):
    req = urllib.request.Request(
        f"{server.rstrip('/')}/api/computers/{computer_id}/telemetry",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "X-Agent-Key": api_key, "User-Agent": "CLMS-Agent/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


def main():
    p = argparse.ArgumentParser(description="CLMS monitoring agent")
    p.add_argument("--id", required=True, help="Computer ID, e.g. PC-001")
    p.add_argument("--server", default="__SERVER_URL__")
    p.add_argument("--key", default="__AGENT_KEY__")
    p.add_argument("--interval", type=int, default=10, help="Seconds between pushes")
    a = p.parse_args()
    print(f"[agent] {a.id} -> {a.server} every {a.interval}s. Ctrl+C to stop.")
    while True:
        try:
            data = collect()
            status = push(a.server, a.key, a.id, data)
            print(f"[agent] {time.strftime('%H:%M:%S')} cpu={data['cpu_usage']}% ram={data['ram_usage']}% disk={data['storage_usage']}% -> HTTP {status}")
        except Exception as e:
            print(f"[agent] push failed: {e}", file=sys.stderr)
        time.sleep(a.interval)


if __name__ == "__main__":
    main()
