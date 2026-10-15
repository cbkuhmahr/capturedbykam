# Manual Yahoo Fantasy roster — $billi-type uh’day.

This private dashboard now has a **Fantasy** tab, using the user's October 15, 2026 Yahoo screenshots for Week 6. No Yahoo developer application is necessary for manual roster use.

## Team in the screenshots
- Monsters of the Midway
- 3–2 entering Week 6; 5th of 12 as displayed in Yahoo.
- Ten starter positions: QB, 2 RB, 3 WR, TE, W/R/T, K, DEF.
- Six bench players.
- Screenshot starter projection: **142.45**.

## Screenshot starters
| Player | Team | Slot | Projection |
| --- | --- | --- | ---: |
| Dak Prescott | DAL | QB | 21.86 |
| D'Andre Swift | CHI | RB | 14.40 |
| Bucky Irving | TB | RB | 14.04 |
| Jaxon Smith-Njigba | SEA | WR | 21.53 |
| Drake London | ATL | WR | 18.37 |
| Stefon Diggs (Q in screenshot) | WAS | WR | 11.53 |
| Colston Loveland | CHI | TE | 9.86 |
| Rhamondre Stevenson | NE | W/R/T | 17.24 |
| Cameron Dicker | LAC | K | 6.95 |
| Seattle Seahawks | SEA | DEF | 6.67 |

## Screenshot bench
| Player | Team | Projection |
| --- | --- | ---: |
| Kyle Pitts Sr. | ATL | 7.91 |
| Jordan Love | GB | 24.33 |
| Jerry Jeudy | CLE | 5.45 |
| Cooper Kupp | SEA | 6.14 |
| Cole Kmet | CHI | 3.29 |
| Demario Douglas | NE | 7.29 |

## Features
- Fantasy tab with complete starters and bench and an editable scouting grade (1–5), opponent rank, projection, injury status, lineup assignment, team/position and opponent.
- Start/Sit recommendation computed from the screenshot's projected fantasy points, lightly adjusted by favorable/unfavorable opponent defensive rank and user-editable subjective talent grade and availability. Yahoo's baseline projection already reflects matchup; adjustments intentionally small.
- Suggests Love over Prescott for Week 6. Applying a suggestion updates **the site's local planner only**, never a Yahoo lineup or family NFL pick.
- Players displayed beneath the NFL scoreboards where they play. Before game time, shows original Yahoo snapshot projections; when ESPN game box scores are available, shows **estimated** live fantasy points and key game stats.
- ESPN box-score estimates use typical yardage, touchdown, turnover and selected reception settings. User can choose standard/half-PPR/PPR **for this estimate only**. The app cannot infer the Yahoo league's specific rules from these screenshots, so estimated points may differ. D/ST scoring intentionally not estimated from ESPN player rows; kicking distance bonuses may differ.
- Yahoo's original optional OAuth integration remains installed but is not required for this feature.
- Existing family pick'em picks, record, Yahoo credentials and URLs are unchanged.

## Updates and privacy
- Manual roster edits are saved in the current browser's localStorage under `wt-manual-fantasy-2026-week6-v1`. They do not sync across browsers/devices yet; the initial 16-player screenshot roster is preloaded for every device.
- There is a Copy roster backup control and Restore screenshot lineup action.
- For next week's roster, the user can provide a fresh screenshot or edit the entries. Week 6 projections and schedules must not be treated as current for later weeks.
- The player-stat adapter makes public ESPN summary requests keyed only by public NFL event ID; it sends no fantasy-team/player selections, private login credentials or picks to ESPN. ESPN's game summary endpoint is an unofficial/publicly observable interface and may be unavailable or change.
- Browser access remains protected by the existing CBK admin login. This is not a new anonymous public page.

## Main files
- `assets/js/whole-thang-manual-fantasy.js`: screenshot roster, browser state, advisor, and live ESPN overlay
- `assets/css/whole-thang-manual-fantasy.css`: responsive iPhone layout
- `api/nfl-player-box.js`: player box-score adapter
- `api/whole-thang.js`: private tab and asset links
- `assets/js/whole-thang-v3.js`: fantasy tab renderer
- `assets/js/whole-thang-live.js`: game score/roster combination
