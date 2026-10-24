# Security Specification: Kodalpur Humanitarian Foundation

## 1. Data Invariants
1. Unauthenticated or non-admin users have strictly read-only access to published public records (donations, members, transactions, activities, policies, foundationInfo, advisors, executives, bloodDonors).
2. All write operations (create, update, delete) on all collections (`donations`, `members`, `transactions`, `activities`, `policies`, `foundationInfo`, `advisors`, `executives`, `bloodDonors`, `admins`) require an authenticated admin whose UID exists in `/admins/{uid}` or matches the designated bootstrapped owner (`newt34441@gmail.com`).
3. Sensitive personal data (like blood donor contact numbers) are only accessible or queryable if `hasConsent == true`. Unconsenting donor personal contact numbers must never be exposed.
4. Transaction records must have strict immutable financial values once recorded unless edited by an authorized admin; types must strictly be either `income` or `expense`.
5. Member records must not expose unauthorized private data; member status must strictly be `active` or `inactive`.
6. Self-role escalation is impossible: no user can write themselves into `/admins/{uid}` without already being an authorized admin or the root verified owner.

## 2. The "Dirty Dozen" Payloads (Vulnerability Payloads to Reject)
1. **Unauthenticated Write**: An unauthenticated POST to `/donations` to inject a fake donation. Expected: `PERMISSION_DENIED`.
2. **Shadow Field Injection**: Admin update payload including `{ isSuperGodMode: true }` in `/members`. Expected: `PERMISSION_DENIED` (hasOnly failure).
3. **Negative / NaN Transaction Amount**: Trying to record an expense of `amount: -5000` or `"NaN"`. Expected: `PERMISSION_DENIED`.
4. **Invalid Transaction Type**: Record with `type: "stolen_cash"`. Expected: `PERMISSION_DENIED`.
5. **Self Role Escalation**: Regular user writing their own UID into `/admins/{my_uid}` with `role: "admin"`. Expected: `PERMISSION_DENIED`.
6. **Blood Donor Without Consent Disclosure**: Creating a donor entry with missing `hasConsent` boolean or trying to scrape unconsenting phone numbers. Expected: `PERMISSION_DENIED`.
7. **Document ID Poisoning**: Storing a document with an ID exceeding 128 characters or special forbidden chars. Expected: `PERMISSION_DENIED`.
8. **Oversized String Flood**: Storing 20MB of text in `policy.content` to exhaust storage. Expected: `PERMISSION_DENIED`.
9. **Fake Email Admin Spoofing**: Requesting write access using an unverified email token claiming to be admin. Expected: `PERMISSION_DENIED`.
10. **Activity Status Poisoning**: Storing `status: "hacked"` instead of `upcoming`, `ongoing`, or `completed`. Expected: `PERMISSION_DENIED`.
11. **Orphaned Financial Modification**: Non-admin attempting to delete a financial transaction to conceal discrepancies. Expected: `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Non-admin attempting to query `/admins` collection to enumerate system administrators. Expected: `PERMISSION_DENIED`.
