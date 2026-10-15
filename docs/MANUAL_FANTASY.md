# Manual fantasy roster and Start/Sit advisor

Private dashboard: https://www.capturedbykam.com/whole-thang/

## Purpose
A Yahoo-free way to follow personal fantasy players in the existing Live Game Center and evaluate the next NFL lineup. It requires **no Yahoo developer application, API key, or password**.

## Steps
1. Sign into the private Captured by Kam admin dashboard and open **$billi-type uh’day. → Fantasy**.
2. Choose **Manage roster** under **Fantasy Scouting Lab**.
3. Paste one player per line using `Player Name | TEAM | POSITION | Avg PPG` (example: `Josh Allen | BUF | QB | 20.5`). A name by itself works, but **team and position must be assigned** before matchup advice and box-score matching can function.
4. Edit each player’s position (QB/RB/WR/TE/K/DST), team, average fantasy points per game (optional), manually selected talent tier 1–5, and starter/bench status.
5. Select scoring type: Standard, Half-PPR (Yahoo public league default), or Full-PPR. Average PPG values must be entered for that scoring type; they are not automatically converted.
6. View estimated start/sit ratings based on a manually supplied average (or an explicitly labeled generic position/talent baseline) and Week 1–5 NFL opponent scoring numbers. Select **Use suggested lineup here** to assign starters locally. This **does not** submit a Yahoo fantasy lineup.
7. During active or completed games, the Fantasy tab attempts to show manual-roster player box-score estimates below the relevant NFL matchup. ESPN stats are unofficial and may be unavailable; Yahoo custom scoring, kickers, D/ST, bonuses, and other special rules are not reproduced.
8. Select **Copy backup** to copy a JSON roster. On another device choose **Manage roster**, paste that JSON into the same text area, and select **Add players** to restore it.

## Recommendation logic
- Default lineup layout: QB, RB, RB, WR, WR, TE, FLEX (RB/WR/TE), K, DST.
- If an average fantasy PPG is entered, the model starts from it and makes only a minor tier adjustment. Otherwise it uses clearly labeled positional assumptions, not verified performance.
- The opponent modifier ranges between -13% and +13% and uses past points allowed per NFL game from the saved Week 1–5 game history. This is **not** position-specific fantasy points allowed.
- Player status is manual. OUT or bye/no game removes a player from suggestions; QUESTIONABLE applies a conservative -15% penalty.
- Approximate live scoring: 0.04/pass yard + 4/pass TD − 1/INT + 0.1/rush yard + 6/rush TD + 0.1/rec yard + 6/rec TD + 0, 0.5, or 1/reception − 2/lost fumble. Stats are read-only from ESPN game summaries, and must not be presented as official Yahoo scores.
- League-specific scoring, injury reporting, playing time, targets, depth charts, and position-specific defensive strengths are **not** connected yet.
- Week 6 data is specifically for October 15–19, 2026. Extend to future weeks in later revisions.

## Privacy / compatibility
- Manual roster is in browser localStorage: `wt-fantasy-manual-v1`. It is **not automatically shared across devices**. Use backup export/import.
- Existing family NFL pick data, Supabase cloud sync, and /whole-thang/ route are unchanged.
- Yahoo API integration remains optional and separate. The Live tab can show either source if later connected.
