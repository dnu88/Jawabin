#!/usr/bin/env python3
"""Read-only public probes. Exit 0 = probes passed, not approval to launch.

Usage: python3 scripts/review-readiness.py [origin]
"""
import http.client
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_ORIGIN = 'https://jawabin-kc75.vercel.app'
PAGES = ('/', '/privacy', '/terms', '/data-deletion', '/status')
SB = 'https://transparencyreport.google.com/transparencyreport/api/v3/safebrowsing/status?'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # A login/landing page at another URL is not a successful probe.


def get(url):
    try:
        with urllib.request.build_opener(NoRedirect).open(url, timeout=15) as response:
            return response.status, response.read(65536).decode('utf-8', 'replace')
    except urllib.error.HTTPError as error:
        error.close()
        return error.code, ''
    except (OSError, http.client.HTTPException):
        return None, ''


def healthy(body):
    try:
        data = json.loads(body)
    except (ValueError, RecursionError):
        return False
    return isinstance(data, dict) and data.get('ok') is True and 'error' not in data


def verdict(body, host):
    try:
        rows = json.loads(body.removeprefix(")]}'"))
        row = rows[0]
        if (isinstance(row, list) and row[0] == 'sb.ssr' and row[8] == host
                and type(row[1]) is int):
            return row[1]
    except (ValueError, IndexError, KeyError, TypeError, RecursionError):
        pass
    return None


def main(origin=DEFAULT_ORIGIN, fetch=get):
    origin = origin.rstrip('/')
    host = urllib.parse.urlsplit(origin).hostname
    results = []

    def probe(label, url, expected, validate=None):
        status, body = fetch(url)
        ok = status == expected
        detail = f'HTTP {status} (expected {expected})' if status else 'network failure'
        if ok and validate:
            ok, note = validate(body)
            detail += '; ' + note
        results.append(ok)
        print(f'{"PASS" if ok else "FAIL"}  {label}: {detail}')

    def check_sb(body):
        code = verdict(body, host)
        return code == 1, f'sb.ssr code {code}' if code is not None else 'unknown verdict'

    for path in PAGES:
        probe(f'GET {path} (reachability only)', origin + path, 200)
    probe('GET /api/health', origin + '/api/health', 200,
          lambda body: (healthy(body), 'requires JSON object with ok=true and no error'))
    probe('anonymous dashboard', origin + '/api/dashboard', 401)
    probe('wrong webhook verify token', origin + '/api/webhook/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1', 403)
    probe(f'Safe Browsing for {host}', SB + urllib.parse.urlencode({'site': host}), 200, check_sb)

    print(f'\n{sum(results)}/{len(results)} public machine checks pass.')
    print('Public launch: NOT ASSESSED. HTTP 200 can be a shared SPA shell; verify rendered pages signed out.')
    print('Reviewer access, real Instagram delivery/replies, recordings and Meta approval are separate. See docs/meta-app-review.md.')
    return 0 if all(results) else 1


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
