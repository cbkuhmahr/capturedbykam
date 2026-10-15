# Yahoo Fantasy Sports API application — prepared for Captured by Kam LLC

Application: https://sports.yahoo.com/developer/access/

Yahoo reviews requests individually. This is a truthful description of a small, personal, read-only fantasy dashboard, not a commercial Yahoo-data redistribution service. **Not submitted.** The user must supply a verified phone number and mailing street address, complete any required agreements, and submit from their own account.

## Required fields

**Name**  
Kamar M. Mosley

**Business Title**  
Owner / Founder

**Email Address**  
kam@capturedbykam.com

**Phone Number**  
[ENTER YOUR BUSINESS CONTACT PHONE — not yet verified]

**Business Name & Address**  
Captured by Kam LLC  
[ENTER YOUR BUSINESS MAILING STREET ADDRESS]  
Toledo, Ohio, United States

**Consumer-Facing Product or App Name**  
$billi-type uh’day.

**Brief Company Description**  
Captured by Kam LLC is an independent Ohio-based photography, videography, and visual storytelling business covering sports, portraits, and events. The business also maintains a private personal web dashboard for the owner's football interests and family NFL pick'em activities. The Yahoo Fantasy integration would be a small, noncommercial feature of that private dashboard and unrelated to customer photography purchases.

**Website URL or App Store Details**  
https://www.capturedbykam.com/whole-thang/  
The dashboard requires the owner's authenticated login. The main public business website is https://www.capturedbykam.com/.

**Describe Your Intended Use Case**  
I am developing a personal, password-protected fantasy football dashboard for my own Yahoo Fantasy Football account. The application, "$billi-type uh’day.", currently displays NFL game schedules and scores, my family NFL pick'em selections, and a manually entered fantasy roster. I want to replace manual entry with optional, authorized, read-only Yahoo Fantasy data.

After I sign in to Yahoo through OAuth 2.0 and explicitly approve access, the app would retrieve only the information needed to display my fantasy leagues and teams, current weekly starters and bench players, player identities and their NFL teams, league scoring settings, fantasy matchups, and weekly fantasy points and statistics. My rostered players would appear underneath the NFL games they are participating in. I would also use their statistics and matchups to generate transparent, advisory Start/Sit comparisons for personal decision-making.

This is intended for my own account, not a general-public fantasy product. I do not need lineup editing, trades, waivers, draft actions, or write permissions. I will not resell or redistribute Yahoo data or provide raw API feeds to others. The dashboard already functions using manual roster entry without Yahoo access; Yahoo would only improve the accuracy and convenience of my personal league view.

**Expected Users (first 3–6 months)**  
1 active user (myself). Choose the smallest accurate range available in the Yahoo dropdown.

**Client ID**  
Leave blank if no existing Yahoo Developer Network application or Client ID. Yahoo's current form says new users may leave this blank.

**Additional Notes**  
Read-only access is sufficient. I plan to request access only to my own authorized Yahoo Fantasy account. This web application already runs at a verified HTTPS domain and uses server-side OAuth exchanges, encrypted HttpOnly session cookies, and access controls. The existing app displays NFL scores from a separate provider and will label Yahoo-provided fantasy statistics appropriately. If a reviewer cannot access the private dashboard without login, I can provide screenshots or a demonstration upon request.

Proposed OAuth redirect URI for the existing implementation:  
https://www.capturedbykam.com/api/yahoo-fantasy?action=callback

## Important

- The final submission is the applicant's decision and must use accurate business contact details.
- Yahoo currently advertises read-only access and manual application review; approval is not guaranteed.
- A Yahoo application, credentials, and production environment configuration remain necessary before automatic Yahoo data import.
- Do not post the Yahoo Client Secret or authentication codes publicly, in GitHub, or in chat.
- The separate manual-roster Fantasy tab does not require Yahoo approval.
