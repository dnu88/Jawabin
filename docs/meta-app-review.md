# Jawabin Testing — reviewer packet (draft, not submitted)

**Target:** https://jawabin-kc75.vercel.app · Meta app `1128649916573434` · Unified Login. Prepare evidence in Development mode. App Review, permission approval and the owner's decision to switch Live are separate steps.

## English answers for the review form

| Permission | Intended use | Evidence currently documented |
| --- | --- | --- |
| `instagram_basic` | Identify the connected professional account on Account Integration and match incoming events to it. | Account check recorded a username, the expected app ID and a subscription to `comments,messages`. This is configuration evidence, not proof of message delivery. |
| `instagram_manage_comments` | Show comments on the connected account's media and let the operator reply as that account. | **Real:** on 2026-11-16, delivery 6 (`comment:stored`, HTTP 200) persisted a comment from another account. A manual reply through Jawabin set it to `resolved` without error; the reply was visible on Instagram. This does not demonstrate an automatic reply. |
| `instagram_manage_messages` | Show inbound DMs in Conversations and respond within the messaging window, manually or by an operator's rule. | **Synthetic only:** a signed fixture created a conversation, stored the message and triggered a keyword reply attempt. Graph rejected the fictitious recipient (`100/2534014`); the fixture was removed. No real inbound DM or successful DM reply is documented. |

Reviewer note: *We have verified real comment delivery and a manual reply. During our DM test we did not observe a real incoming message at the webhook. The signed fixture tested application handling, not Instagram delivery. We have not established the cause.* Do not present Advanced Access as a proven fix.

## Owner checklist before review

1. Run `python3 scripts/review-readiness.py`. On 2026-11-18 the public probe passed 9/9; Google returned Safe Browsing code 1 for this host. Exit 0 means only that the listed responses matched at that time. In a signed-out browser open the [home](https://jawabin-kc75.vercel.app/), [privacy](https://jawabin-kc75.vercel.app/privacy), [terms](https://jawabin-kc75.vercel.app/terms), [deletion instructions](https://jawabin-kc75.vercel.app/data-deletion) and [status](https://jawabin-kc75.vercel.app/status) URLs directly. Verify the intended content, not a login screen, blank page or shared SPA shell. Stop on a browser warning. In the same day's signed-out Chrome check, home and all three legal pages rendered their intended text, but `/status` opened `/login` after HTTP 200. Do not list it as a public status page unless that changes and is reverified.
2. Verify the dedicated reviewer login can access the test account unaided. Supply credentials only through Meta's private reviewer fields; keep passwords, tokens, OAuth callback parameters and unrelated customer data out of this packet and recordings.
3. Record consent → connected account → new real comment → Comments → manual reply → reply visible on Instagram. For messaging, first confirm sender eligibility, account messaging settings and current app/account subscriptions. With the owner's agreement, send a uniquely identifiable DM from a different eligible account; correlate its timestamp with request logs, delivery ledger and conversation. Record both the real inbound message and a reply visible to the sender. If absent, keep the messaging evidence open; do not replace it with a demo.
4. In Meta's dashboard verify the contact email, icon, category, current legal URLs, requested access for each permission and any business-verification requirement. Match each claim to its recording. Obtain owner authorization separately for submission and for any later public launch. This packet performs neither.
