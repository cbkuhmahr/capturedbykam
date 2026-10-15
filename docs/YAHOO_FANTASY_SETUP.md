# Yahoo Fantasy integration — $billi-type uh’day.

The Live Game Center can display official Yahoo Fantasy player scores and weekly statistics underneath each NFL game. It uses a read-only Yahoo OAuth 2.0 authorization, linked to the existing private CBK admin login.

## Before activation

Yahoo reviews and approves new Fantasy Sports API applications. Apply at https://sports.yahoo.com/developer/access/ with this use case:

> Private read-only NFL fantasy dashboard embedded within my password-protected personal website at capturedbykam.com/whole-thang/. The dashboard shows my own Yahoo Fantasy Football leagues, starters/bench roster, game-by-game fantasy points, and player statistics alongside live NFL game scores. No lineup editing, trades, or collection of other users' credentials. Expected use: one personal account (and possibly family). Data updates while my private dashboard is open.

Yahoo's currently published access is read-only. It does not enable lineup changes.

## After Yahoo approves

Configure the following Vercel **Production** environment variables for the **capturedbykam** project. Enter credentials directly into the Vercel dashboard; never commit them or paste them in chat.

- `YAHOO_CLIENT_ID`: Yahoo-issued OAuth client ID.
- `YAHOO_CLIENT_SECRET`: Yahoo-issued OAuth client secret.
- `YAHOO_SESSION_SECRET`: an unpredictable random secret, at least 32 characters. Generate securely, e.g. `openssl rand -hex 32`.
- `YAHOO_REDIRECT_URI`: `https://www.capturedbykam.com/api/yahoo-fantasy?action=callback`

Register the **exact** callback URL in the approved Yahoo application and redeploy production after setting variables.

## User experience

1. Log into the CBK private dashboard as usual.
2. Go to `https://www.capturedbykam.com/whole-thang/` and open **Fantasy**.
3. Select **Connect Yahoo**; approve the Yahoo read-only prompt.
4. On the confirmation page, choose **Open $billi-type uh’day.**
5. If you manage multiple Yahoo teams, select one in the Fantasy panel.
6. The Fantasy tab shows each rostered player beneath their NFL game, with Yahoo weekly fantasy points and stat categories when Yahoo supplies them.
7. Select **Disconnect** at any time to delete the device's encrypted Yahoo session.

The separate Live tab continues to show NFL scores independently, even if Yahoo is unavailable. Yahoo roster data refreshes while the tab is open, about every 90 seconds.

## Data and security notes

- The existing `/whole-thang/` URL, NFL picks, and existing cloud sync remain unchanged.
- Access to Yahoo roster endpoints requires the existing CBK admin session.
- OAuth credentials are exchanged on the server, never in client JavaScript.
- Yahoo access/refresh tokens are encrypted (AES-256-GCM) inside an HttpOnly, Secure, SameSite=Lax cookie on **the browser that completed the authorization**. Each browser must connect separately; no Yahoo credentials or player data are committed to GitHub.
- Yahoo OAuth state is random and checked before exchanging codes.
- No Yahoo **write** calls are used.
- The live ESPN NFL score service is separate from Yahoo fantasy scoring; the dashboard does not recompute Yahoo's league-specific scoring formula.
- If league-specific Yahoo stat labels are unavailable, numeric Yahoo stat IDs appear rather than guessed labels.
- This integration can only be live-tested once Yahoo issues credentials and the account has approved access.

## Files

- `api/yahoo-fantasy.js` — protected OAuth status/connect/callback/roster/disconnect
- `assets/js/whole-thang-fantasy.js` — private client widget
- `assets/css/whole-thang-fantasy.css` — mobile styling
- `assets/js/whole-thang-live.js` — render Yahoo player rows beneath NFL games
- `api/whole-thang.js` — register styles and script
