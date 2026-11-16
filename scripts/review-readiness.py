#!/usr/bin/env python3
"""Pre-submission gate for Meta App Review.

Only checks that can be answered from the outside, without a browser session and
without writing anything: public pages, the health probe, the auth gate on a
private route, the webhook handshake refusal, and the Google Safe Browsing
verdict for the domain. Everything a reviewer will meet on their first click is
in here; anything that needs a human is listed at the end with the reason.

Usage: python3 scripts/review-readiness.py [origin]
Exit code 0 when every machine-checkable gate passes, 1 otherwise.
"""
import json
import sys
import urllib.error
import urllib.request

ORIGIN = (sys.argv[1] if len(sys.argv) > 1 else "https://jawabin-kc75.vercel.app").rstrip("/")
HOST = ORIGIN.split("//", 1)[-1]
results = []


def record(gate, ok, detail):
    results.append((gate, bool(ok), detail))


def get(path, headers=None):
    request = urllib.request.Request(ORIGIN + path, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.read().decode("utf-8", "replace")[:200]
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")[:200]


def main():
    for path, label in [
        ("/", "public home page"),
        ("/privacy", "privacy policy"),
        ("/terms", "terms of service"),
        ("/data-deletion", "data deletion instructions"),
    ]:
        status, _ = get(path)
        record(label, status == 200, f"GET {path} -> {status}")

    status, body = get("/api/health")
    record("health probe", status == 200 and '"ok"' in body.replace(" ", ""), f"GET /api/health -> {status} {body.strip()[:60]}")

    status, body = get("/api/dashboard")
    record("private API needs a session", status == 401, f"GET /api/dashboard -> {status} {body.strip()[:40]}")

    status, _ = get("/api/webhook/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1")
    record("webhook refuses a wrong verify token", status == 403, f"handshake with wrong token -> {status}")

    try:
        verdict = urllib.request.urlopen(
            "https://transparencyreport.google.com/transparencyreport/api/v3/safebrowsing/status?site=" + HOST, timeout=30
        ).read().decode("utf-8", "replace")
        payload = json.loads(verdict.split(")]}'", 1)[-1])[0]
        code = payload[1]
        # 1 = no unsafe content found; anything else (2 = flagged, 4 = host-level
        # verdict missing) means Chrome may show an interstitial to the reviewer.
        record("Safe Browsing clean for the domain", code == 1, f"sb.ssr status {code} for {HOST}")
    except Exception as error:  # noqa: BLE001 - a probe failure is not a pass
        record("Safe Browsing clean for the domain", False, f"verdict unreadable: {error}")

    width = max(len(gate) for gate, _, _ in results)
    for gate, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {gate.ljust(width)}  {detail}")

    print("\nNeeds a human (cannot be answered from outside):")
    print("- reviewer test account exists, can sign in, and is connected to the test Instagram account")
    print("- real inbound comment AND DM have been seen arriving (the delivery ledger has a handled row)")
    print("- screencasts recorded against those two real events")
    print("- Meta dashboard fields (icon, category, contact email, data deletion URL) saved")

    failed = [gate for gate, ok, _ in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} machine checks pass")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
