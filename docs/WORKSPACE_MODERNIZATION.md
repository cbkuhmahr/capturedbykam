# Workspace modernization — November 3, 2026

## Review completed before implementation

Scope: the existing `/whole-thang` and `/whole-thang/` sports application and the shared CBK admin interface. Reviewed the repository's 78 text source files, static page structure, all JavaScript syntax, route configuration, API boundaries, storage keys, stylesheet cascade, and sports/admin event flows. The photography storefront, prices, checkout, email delivery, upload limits, and booking workflow remain in place.

This is a vanilla HTML/CSS/JavaScript application with Vercel Node handlers, rather than a React application. Retain that architecture: a framework migration would add risk and weight without improving these workflows.

### Feature inventory to preserve

| Area | Existing capabilities |
| --- | --- |
| Scores | NFL schedules, live/final scores, automatic refresh, manual refresh, yesterday/today/upcoming/full-week filters, all/live/not-final/my-picks filters, favorite teams, density preference, keep-awake control, optional odds |
| Game details | Statistics, quarter scores, scoring plays, division standings, spread/total/moneyline, tracked players, previous/next game, swipe and keyboard navigation |
| Picks | Team selection, editing, save, save and lock, device sync and verification, Monday winner and predicted-margin rules, weekly rollover |
| Intelligence | Existing Elo-style forecasts, model lean selection, home-field adjustment, confidence filters, all 32 team rankings and sort modes |
| Results | Visible weekly correct/wrong tally, season totals, accuracy excluding ties, immutable 79-game historical baseline, expandable weekly game history |
| Fantasy | Existing roster, manual editor, text/JSON import, backup, scoring formats, start/sit estimates, suggested lineup, availability, live player statistics |
| Personal tools | Messages/share sheet, current picks, season and weekly result sharing, NFL calendar subscription/download, local vCard/contact picker, Work Schedule with all three shifts and overnight ICS export |
| Media | Both radio stations, provider fallback links, player load/reload/stop, lounge close/stop, dock, viewing destinations |
| Data | Current storage keys and formats, local backup import/copy/reset, authenticated cloud sync and archive conflict preservation |
| Admin | PIN, Authenticator, passkeys, session lock, workspace chooser, overview, galleries/create/edit/delete/photo management/upload/repair, bookings, orders/status/payment/delivery, security controls, public gallery/QR destinations |
| Photography site | Home/about/booking/shop/gallery and product pages, existing calculators/pricing, payments/wallets, receipts and fulfillment integrations |

### Weaknesses found

1. Sports presentation is spread across two inline style blocks and eight linked stylesheets with repeated overrides. Typography, cards, forms, and tables vary by module.
2. A desktop screen uses a narrow, phone-like navigation layout; secondary destinations are buried in More. Mobile controls and long tables need a consistent responsive treatment.
3. Cloud status changes rebuild the active page. Live score/detail updates and fantasy statistics also replace editable content, losing focus, expanded sections, scroll positions, and unfinished paste drafts.
4. Background score, schedule, odds, and player refreshes can duplicate work on visibility changes. The first standings failure remains cached for the entire page lifetime; game details have no refresh expiry.
5. Custom dialogs lack consistent focus containment and return behavior. More-menu keyboard handling, pressed states, table headers, label associations, and validation feedback need refinement.
6. The global `hidden` attribute is not consistently protected from component `display` declarations. The live sign-in screen exposed both PIN and Authenticator form sections simultaneously.
7. Team tables expose sorting through a select only, without directional column controls. Dense data needs sticky headers, numeric alignment, and local horizontal scrolling.

## Implementation plan

1. Consolidate sports styles into a shared token foundation and one sports component stylesheet; retain independent tools and all existing routes and IDs.
2. Introduce a desktop navigation rail, mobile bottom navigation, a clear content header, and immediately visible weekly/season results. Preserve More and every destination.
3. Standardize cards, buttons, inputs, status indicators, responsive grids, tables, empty states, and modal surfaces. Keep text concise and data scopes accurate.
4. Add a small shared UI utility for focus-preserving updates, draft/expansion/scroll preservation, request deduplication, and dialog keyboard containment. Replace broad app mutation listeners with explicit render events.
5. Update cloud status in place, improve loading/error states, bound public-data caches, and throttle duplicate refresh triggers. Do not change calculations, sync conflict resolution, pricing, permissions, or auth requirements.
6. Refine admin presentation and gallery/order discovery while retaining every action and integration.
7. Validate syntax, feature parity, grading/model/scoring/calendar equivalence, API guards, responsive layouts, keyboard behavior, drafts during refresh, and production deployment. Use isolated sample fixtures for authenticated screen QA; do not fabricate claims of live account/payment verification.

## Verification boundaries

The production sports route correctly redirects this browser to admin sign-in. No authentication settings will be weakened to inspect it. Local visual and interaction QA uses the actual application code with isolated sample API responses. Live account operations, passkey enrollment, external radio/provider playback, payment transactions, and physical iPhone calendar import require their normal authenticated/device flows.

## Implemented

- Shared design tokens and accessible form/focus foundation for sports and studio admin. Sports now loads two stylesheets instead of ten style sources, including the removed inline style blocks. Sports CSS fell from 84,417 to approximately 54,000 bytes, about 36% smaller. Existing legacy asset files remain available for compatibility.
- Authenticated HTML moved from a long escaped string in the request handler to a separate presentation module. Routes, authentication checks, history injection and cache/privacy headers are retained. Malformed cookie encoding is safely ignored instead of throwing before the handler can redirect.
- Desktop navigation rail; mobile bottom navigation; all eight sports screens and every More tool retained. Weekly results remain prominent, and mobile season results stay visible without repeating large cards ahead of the games.
- Standardized cards, buttons, grids, labels, validation, status feedback, tables, sticky table headers, local table scrolling, and responsive forms. Added matchup/team search and directional team-table sort controls.
- Cloud status updates occur in place. Focus, unsent textarea drafts, expanded history sections and local scroll positions survive content updates. Fantasy form nodes remain mounted during field/stat updates. Explicit render events replace the two broad app-content mutation listeners.
- Public sports requests can share in-flight work and bounded caches; private endpoints are explicitly excluded. Fantasy box scores use up to three concurrent reads and one resulting UI notification. Standings can recover from failure, and game detail data refreshes after its cache expires. Weekly schedule checks suppress duplicate immediate requests.
- Game sheets and other custom drawers contain keyboard focus, make the background inert, and restore a visible opener. More supports arrow/Home/End/Escape navigation. Game left/right keys follow previous/next order. Sharing lists all available completed weeks instead of only Weeks 1–5.
- Admin has searchable galleries, inquiries and orders, gallery visibility filtering, order-status counts, an outstanding-work overview and the latest gallery. All upload/repair/photo-management/order-delivery/security actions remain. Project creation guards duplicate submissions. Photo counts are indexed once per refresh instead of filtering the complete photo list for every gallery.
- Protected `hidden` semantics prevent overlapping sign-in stages and ensure only the active admin view is exposed. Authentication, passkeys, MFA, session limits, payment calculations and email delivery behavior were not changed.

## Verification results

Run `node --test tests/workspace-modernization.test.cjs` for the eleven dependency-free regression tests.

| Check | Result |
| --- | --- |
| All repository JavaScript parses | Pass |
| Verified history, wins/losses/ties and tie-excluded accuracy | Pass: 79 picks, baseline 54–24–1T / 69.23% |
| Existing team ratings against pre-change implementation | Pass: all 32 teams identical |
| Forecasts against pre-change implementation | Pass: 40 home-edge/neutral/matchup scenarios identical |
| Standard / half-PPR / PPR / kicking points and suggested lineup | Pass; suggested lineup identical to baseline |
| Overnight calendar export and month/leap-year boundaries | Pass; three export scenarios identical to baseline except generated timestamp |
| Page/sync method, session, origin and action guards | Pass |
| Public request deduplication and private-cache exclusion | Pass |
| Navigation and tool inventory | Pass; eight views and all original optional tools retained |
| Desktop/laptop/tablet/phone/small-phone scores layout | Pass at 1440, 1024, 768, 390 and 320 pixel frames; no document horizontal overflow |
| Sports views | Pass: overview, fantasy, picks, intelligence, rankings, history, data, scores |
| Pick selection → lock → edit → margin entry | Pass with isolated records |
| Team search and column sorting | Pass |
| Unfinished backup during Sync & Verify | Pass; text preserved |
| Fantasy paste during scoring-format update | Pass; text and mounted editor preserved |
| Matchup search, standings, modal focus wrap/return, background inert | Pass |
| Sharing, current-week result choices, calendar and vCard controls | Pass |
| Radio player load → stop | Pass; embedded player removed and stopped state displayed; broadcaster playback itself not verified |
| Work-shift selection → export enabled | Pass; overnight ICS bytes separately verified |
| Admin overview, galleries, bookings, orders, security | Pass with isolated records; 25 view/viewport combinations without document overflow |
| Admin search and existing gallery edit/pricing fields | Pass; existing $25 package value preserved |

Sample records and the component mount harness live outside the production repository and are not shipped. No real orders, bookings, galleries, picks, passkeys, customers, payment transactions or email deliveries were changed during QA.

## Deployed backend review

Read the four deployed Edge Function source packages (`cbk-auth`, `cbk-admin`, `cbk-checkout`, `whole-thang-sync`), the public-schema table inventory, and both security/performance advisories. No database or Edge Function mutations were made.

- All thirteen listed public-schema tables have RLS enabled. Eight server-managed auth/pick tables have no client RLS policies. Their Edge Function paths use explicit session authorization and a server-side service role; absent client policies remain in place.
- The existing admin backend verifies hashed session tokens and enforces its idle/maximum session limits. The gallery/order paths protect purchased originals and retain paid order history. Checkout retains its session-token and original-file preflight checks. These controls and calculations are preserved.
- Dashboard reads already run concurrently. Projects, photos and orders are currently loaded in full; server pagination is a future scaling option, but introducing a result limit in this refinement would risk hiding existing records and tools. Current gallery photo counts are optimized on the client without changing that API contract.
- No advisory was treated as permission to drop data, indexes, capabilities or security controls.

| Advisory | Assessment and retained behavior | Reference |
| --- | --- | --- |
| RLS enabled without client policies, eight server-managed tables (informational) | Retained; client access remains denied by default. Do not add broad policies to silence the advisory. | [RLS policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) |
| Leaked-password protection disabled (project-wide warning) | Existing site admin sign-in uses custom PIN/MFA/passkeys. No Supabase Auth password settings were changed by this UI refinement. | [Password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |
| Four unused indexes (informational) | Retained. A short observation window is insufficient evidence to remove indexes used by future booking, checkout and order workflows. | [Index advisory guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) |
