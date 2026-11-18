# Production settings route audit

Baseline: `4ff8011`. `Setting.vue` filtered its links with `visibleSettingItems(authEnabled)`, but `src/router.js` registered every settings child. A signed-in visitor could therefore open a bookmarked demo page that was absent from the menu.

| Under `/user/setting/` | Evidence in `src/api.js` | Auth-configured routing |
| --- | --- | --- |
| `twofactor` | Placeholder QR; verification checks six-digit format and updates local state, not Supabase MFA. | Localized placeholder |
| `session`, `transaction`, `connected-app` | Lists read demo sessions, invoices and app grants. | Localized placeholder |
| `api`, `developer`, `webhook`, `tikwm`, `redeem` | API key rotation, developer apps, outgoing webhook configuration, Tikwm keys and redemption use demo state. | Localized placeholder |
| `profile`, `activity`, `notification`, `ai` | Existing production settings; profile rename is unchanged. | Original page |

The router now uses the same filtered list as the menu. With Supabase configured, hidden URLs match the existing `user-placeholder` route (`Placeholder.vue`, `t('feature.soon')`) instead of loading a mock component. The existing login guard still applies to `/user` routes. Without Supabase, all 13 settings pages remain registered. This is a client navigation change, not an API authorization change or an MFA implementation.

## Local verification

- `npm test -- tests/unit/settings-routing.test.js`: the new test failed before the fix (`session` matched the mock route). Afterward the mode-specific matcher tests pass for all settings, including bookmarked paths with a trailing slash, query and fragment.
- `npm test`: 231 tests passed. `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- --workers=2`: 33 demo browser tests passed, including profile rename across reload and direct settings navigation.
- The authenticated configuration was tested locally with auth state stubbed; no hosted session or deployment was used.
