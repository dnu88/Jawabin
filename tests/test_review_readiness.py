import importlib.util
import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

path = Path(__file__).resolve().parents[1] / 'scripts/review-readiness.py'
spec = importlib.util.spec_from_file_location('readiness', path)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
origin = 'https://example.test'


class ReviewChecks(unittest.TestCase):
    def report(self, overrides=None):
        responses = {origin + path: (200, '<div id="app"></div>') for path in probe.PAGES}
        responses.update({
            origin + '/api/health': (200, '{"ok": true}'),
            origin + '/api/dashboard': (401, ''),
            origin + '/api/webhook/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1': (403, ''),
            probe.SB + 'site=example.test': (200, json.dumps([['sb.ssr', 1, False, False, False, False, False, 0, 'example.test']])),
        })
        responses.update(overrides or {})
        output = io.StringIO()
        with redirect_stdout(output):
            code = probe.main(origin, responses.__getitem__)
        return code, output.getvalue()

    def test_shell_is_only_reachability(self):
        code, report = self.report()
        self.assertEqual(code, 0)
        self.assertIn('GET /status (reachability only)', report)
        self.assertIn('Public launch: NOT ASSESSED', report)

    def test_invalid_health_fails(self):
        for status, body in [(503, '{"ok":true}'), (200, '{"ok":'), (200, '["ok"]'),
                             (200, '{"ok":false}'), (200, '{"ok":1}'), (200, '{"error":"ok"}'),
                             (200, '{"ok":true,"error":"down"}')]:
            with self.subTest(status=status, body=body):
                self.assertEqual(self.report({origin + '/api/health': (status, body)})[0], 1)

    def test_status_route_must_return_200(self):
        self.assertEqual(self.report({origin + '/status': (404, '')})[0], 1)

    def test_transport_failure_does_not_abort_report(self):
        for error in (URLError('offline'), TimeoutError()):
            with self.subTest(error=error), patch.object(probe.urllib.request, 'build_opener') as opener:
                opener.return_value.open.side_effect = error
                output = io.StringIO()
                with redirect_stdout(output):
                    self.assertEqual(probe.main(origin), 1)
                self.assertIn('0/9 public machine checks pass', output.getvalue())

    def test_unknown_or_flagged_verdict_fails(self):
        for body in ['{}', 'not json', '[["sb.ssr",1]]',
                     '[["sb.ssr",2,false,false,false,false,false,0,"example.test"]]',
                     '[["sb.ssr",1,false,false,false,false,false,0,"other.test"]]']:
            with self.subTest(body=body):
                self.assertEqual(self.report({probe.SB + 'site=example.test': (200, body)})[0], 1)
