const AUTH_FUNCTION = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/cbk-auth";
const COOKIE_NAME = "cbk_admin_session";
const PAGE = require("../lib/whole-thang-page");
const HISTORY_ROWS = "1 NE SEA SEA SEA 13 10\n1 SF LAR LAR SF 27 7\n1 CHI CAR CHI CHI 59 37\n1 TB CIN TB CIN 33 27\n1 NO DET DET DET 31 30\n1 BUF HOU BUF BUF 36 31\n1 BAL IND BAL BAL 41 23\n1 CLE JAX JAX JAX 34 10\n1 ATL PIT PIT PIT 20 13\n1 NYJ TEN NYJ NYJ 23 10\n1 ARI LAC LAC ARI 26 14\n1 MIA LV LV LV 27 13\n1 GB MIN MIN MIN 39 22\n1 WAS PHI PHI PHI 24 22\n1 DAL NYG DAL NYG 28 20\n1 DEN KC DEN KC 31 10\n2 DET BUF BUF BUF 41 31\n2 CAR ATL CAR CAR 34 3\n2 NO BAL BAL NO 24 17\n2 MIN CHI CHI MIN 9 3\n2 CIN HOU CIN CIN 20 6\n2 PIT NE NE NE 20 3\n2 GB NYJ GB GB 20 17\n2 CLE TB TB CLE 23 19\n2 PHI TEN PHI PHI 24 20\n2 JAX DEN DEN DEN 20 13\n2 LV LAC LAC LV 26 14\n2 SEA ARI SEA SEA 31 7\n2 WAS DAL DAL DAL 37 20\n2 MIA SF SF SF 35 13\n2 IND KC KC KC 33 30\n2 NYG LAR LAR LAR 28 6\n3 ATL GB GB ATL 35 14\n3 LAC BUF BUF BUF 24 16\n3 CAR CLE CAR CLE 21 18\n3 NYJ DET DET DET 31 24\n3 NE JAX JAX JAX 35 6\n3 HOU IND IND IND 19 17\n3 KC MIA KC KC 24 10\n3 TEN NYG NYG NYG 12 7\n3 CIN PIT CIN PIT 30 27\n3 SEA WAS SEA WAS 33 31\n3 ARI SF SF SF 36 30\n3 MIN TB MIN MIN 23 16\n3 LV NO NO LV 35 27\n3 BAL DAL DAL BAL 34 31\n3 LAR DEN LAR DEN 30 26\n3 PHI CHI PHI CHI 27 7\n4 PIT CLE CLE CLE 27 24\n4 IND WAS IND IND 30 13\n4 TEN BAL BAL BAL 24 18\n4 NE BUF BUF NE 29 26\n4 NYJ CHI CHI CHI 23 12\n4 JAX CIN JAX JAX 22 17\n4 DAL HOU DAL DAL 34 30\n4 ARI NYG NYG NYG 36 24\n4 LAR PHI LAR LAR 24 20\n4 GB TB GB GB 17 14\n4 MIA MIN MIN MIN 15 10\n4 KC LV KC KC 30 27\n4 LAC SEA SEA SEA 30 23\n4 DEN SF SF SF 24 14\n4 DET CAR CAR CAR 32 26\n4 ATL NO NO ATL 45 24\n5 TB DAL DAL TB 24 16\n5 PHI JAX JAX JAX 19 17\n5 CIN MIA CIN CIN 31 24\n5 LV NE LV NE 45 17\n5 MIN NO MIN MIN 23 13\n5 CLE NYJ NYJ NYJ 17 12\n5 IND PIT PIT PIT 34 22\n5 HOU TEN HOU HOU 26 3\n5 NYG WAS WAS T 27 27\n5 DEN LAC DEN DEN 23 17\n5 DET ARI DET DET 45 21\n5 CHI GB CHI GB 31 7\n5 SF SEA SF SF 32 29\n5 BAL ATL ATL BAL 30 23\n5 BUF LAR LAR BUF 37 34";

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) { try { out[key] = decodeURIComponent(value); } catch {} }
  }
  return out;
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", COOKIE_NAME + "=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict");
}

module.exports = async function handler(req, res) {
  if (!["GET","HEAD"].includes(req.method)) {
    res.setHeader("Allow","GET, HEAD");
    return res.status(405).end("Method not allowed");
  }

  const cookies = parseCookies(String(req.headers.cookie || ""));
  const sessionToken = cookies[COOKIE_NAME] || "";

  if (!sessionToken) {
    res.setHeader("Cache-Control","no-store");
    return res.redirect(302, "/admin.html");
  }

  try {
    const response = await fetch(AUTH_FUNCTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://www.capturedbykam.com",
        "x-cbk-admin-token": sessionToken
      },
      body: JSON.stringify({ action: "securityStatus" })
    });

    if (!response.ok) {
      clearSessionCookie(res);
      return res.redirect(302, "/admin.html");
    }

    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.setHeader("Cache-Control","private, no-store, max-age=0");
    res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive");
    res.setHeader("Referrer-Policy","same-origin");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(PAGE.replace("__WT_HISTORY__", JSON.stringify(HISTORY_ROWS)));
  } catch {
    res.setHeader("Cache-Control","no-store");
    return res.status(503).send("$billi-type uh’day. is temporarily unavailable.");
  }
};
