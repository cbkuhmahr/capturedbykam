(() => {
  "use strict";
  const opener = document.getElementById("wt-shifts-open");
  if (!opener) return;

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  // Five Excel dropdown shifts, plus two custom shift options.
  const SHIFTS = {
    morning: { label: "7 AM – 3 PM", start: "070000", end: "150000", overnight: false },
    shortMorning: { label: "7 AM – 11 AM", start: "070000", end: "110000", overnight: false },
    shortEvening: { label: "3 PM – 7 PM", start: "150000", end: "190000", overnight: false },
    evening: { label: "3 PM – 11 PM", start: "150000", end: "230000", overnight: false },
    longOvernight: { label: "7 PM – 7 AM", start: "190000", end: "070000", overnight: true },
    overnight: { label: "11 PM – 7 AM", start: "230000", end: "070000", overnight: true },
    earlyMorning: { label: "3 AM – 7 AM", start: "030000", end: "070000", overnight: false }
  };
  const pad = n => String(n).padStart(2, "0");
  const storeKey = ym => "wt-work-shifts-v1:" + ym;
  const dateFor = (y, m, d) => y + "-" + pad(m) + "-" + pad(d);
  const icsDate = (day, hms) => day.replace(/-/g, "") + "T" + hms;
  const oneDayLater = day => {
    const parts = day.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2] + 1);
    return dateFor(date.getFullYear(), date.getMonth() + 1, date.getDate());
  };
  const icsEscape = text => String(text).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const now = new Date();
  // Use the following month during the final week; otherwise use the current month.
  const initial = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 25 ? 1 : 0), 1);
  let year = initial.getFullYear();
  let month = initial.getMonth() + 1;
  let lastFocus = null;
  let oldOverflow = "";
  let selections = {};

  // Visual rules are shared in whole-thang-workspace.css.

  const dialog = document.createElement("section");
  dialog.id = "wt-shifts-overlay";
  dialog.className = "wt-shifts-overlay";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "wt-shifts-title");
  dialog.innerHTML = [
    '<div class="wt-shifts-shell">',
    '<header class="wt-shifts-head"><div><div class="wt-shifts-kicker">Personal tools / Work schedule</div>',
    '<h2 id="wt-shifts-title">Work Shift Calendar</h2>',
    '<p>Choose a shift next to each date. Export every selected shift in one iPhone Calendar file.</p></div>',
    '<button class="wt-shifts-close" type="button" id="wt-shifts-close">Done</button></header>',
    '<div class="wt-shifts-panel"><div class="wt-shifts-controls">',
    '<div><label for="wt-shifts-month">Month</label><select id="wt-shifts-month"></select></div>',
    '<div><label for="wt-shifts-year">Year</label><input id="wt-shifts-year" type="number" inputmode="numeric" min="2000" max="2099"></div>',
    '</div><div class="wt-shifts-columns"><span>Date</span><span>Shift</span></div>',
    '<div id="wt-shifts-days"></div></div>',
    '<div class="wt-shifts-actions"><span id="wt-shifts-count">No shifts selected</span>',
    '<button type="button" class="wt-shifts-clear" id="wt-shifts-clear">Clear month</button></div>',
    '<p class="wt-shifts-help">11 PM – 7 AM shifts end the next morning. Times use Toledo / Eastern Time. ',
    'Selections stay on this device until cleared; this does not change NFL data.</p>',
    '</div><div class="wt-shifts-bar"><div class="wt-shifts-barinner">',
    '<button type="button" class="wt-shifts-export" id="wt-shifts-export" disabled>Convert to iPhone Calendar (.ics)</button>',
    '<p class="wt-shifts-status" id="wt-shifts-status" role="status">Select a shift to export.</p>',
    '</div></div>'
  ].join("");
  document.body.appendChild(dialog);
  const byId = id => dialog.querySelector("#" + id);
  const monthSelect = byId("wt-shifts-month");
  const yearInput = byId("wt-shifts-year");
  MONTHS.forEach((label, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = label;
    monthSelect.appendChild(option);
  });
  monthSelect.value = String(month);
  yearInput.value = String(year);

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(storeKey(dateFor(year, month, 1).slice(0, 7))) || "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch { return {}; }
  }
  function persist() {
    try { localStorage.setItem(storeKey(dateFor(year, month, 1).slice(0, 7)), JSON.stringify(selections)); } catch {}
  }
  function updateCount() {
    const count = Object.keys(selections).length;
    byId("wt-shifts-count").textContent = count + " shift" + (count === 1 ? "" : "s") + " selected";
    byId("wt-shifts-export").disabled = !count;
    byId("wt-shifts-status").textContent = count ? "Exports " + count + " shift" + (count === 1 ? "" : "s") + " in one file." : "Select a shift to export.";
  }
  function render() {
    monthSelect.value = String(month);
    yearInput.value = String(year);
    selections = load();
    const days = byId("wt-shifts-days");
    days.textContent = "";
    const length = new Date(year, month, 0).getDate();
    for (let day = 1; day <= length; day++) {
      const date = new Date(year, month - 1, day);
      const ymd = dateFor(year, month, day);
      const row = document.createElement("div");
      row.className = "wt-shifts-row" + (date.getDay() === 0 || date.getDay() === 6 ? " weekend" : "");
      const dateLabel = document.createElement("div");
      dateLabel.className = "wt-shifts-date";
      dateLabel.textContent = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date) + ", " + MONTHS[month - 1] + " " + day;
      const yearSub = document.createElement("span");
      yearSub.className = "wt-shifts-sub";
      yearSub.textContent = String(year);
      dateLabel.appendChild(yearSub);
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Shift for " + MONTHS[month - 1] + " " + day + ", " + year);
      select.dataset.date = ymd;
      [["", "Off / No shift"], ["morning", SHIFTS.morning.label], ["shortMorning", SHIFTS.shortMorning.label], ["shortEvening", SHIFTS.shortEvening.label], ["evening", SHIFTS.evening.label], ["longOvernight", SHIFTS.longOvernight.label], ["overnight", SHIFTS.overnight.label], ["earlyMorning", SHIFTS.earlyMorning.label]].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
      select.value = SHIFTS[selections[ymd]] ? selections[ymd] : "";
      select.classList.toggle("selected", Boolean(select.value));
      select.addEventListener("change", () => {
        if (select.value) selections[ymd] = select.value;
        else delete selections[ymd];
        select.classList.toggle("selected", Boolean(select.value));
        persist();
        updateCount();
      });
      row.append(dateLabel, select);
      days.appendChild(row);
    }
    updateCount();
  }
  function fold(lines) {
    const out = [];
    const encoder = new TextEncoder();
    for (let line of lines) {
      let first = true;
      while (encoder.encode(line).length > 73) {
        let n = Math.min(70, line.length);
        while (n > 1 && encoder.encode(line.slice(0, n)).length > 73) n--;
        out.push((first ? "" : " ") + line.slice(0, n));
        line = line.slice(n);
        first = false;
      }
      out.push((first ? "" : " ") + line);
    }
    return out.join("\r\n") + "\r\n";
  }
  function createICS(selected) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Captured by Kam//WholeThang Work Shifts//EN",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Mimi Work Schedule",
      "X-WR-TIMEZONE:America/New_York",
      "BEGIN:VTIMEZONE", "TZID:America/New_York", "X-LIC-LOCATION:America/New_York",
      "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0400", "TZNAME:EDT",
      "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0500", "TZNAME:EST",
      "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
      "END:STANDARD", "END:VTIMEZONE"
    ];
    Object.keys(selected).sort().forEach(day => {
      const value = selected[day], shift = SHIFTS[value];
      if (!shift || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      lines.push(
        "BEGIN:VEVENT",
        "UID:mimi-work-" + day + "-" + value + "@capturedbykam.com",
        "DTSTAMP:" + stamp,
        "DTSTART;TZID=America/New_York:" + icsDate(day, shift.start),
        "DTEND;TZID=America/New_York:" + icsDate(shift.overnight ? oneDayLater(day) : day, shift.end),
        "SUMMARY:" + icsEscape("Mimi Work – " + shift.label),
        "DESCRIPTION:" + icsEscape("Work shift"),
        "STATUS:CONFIRMED", "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    return fold(lines);
  }
  function close() {
    dialog.hidden = true;
    document.body.style.overflow = oldOverflow;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  opener.addEventListener("click", () => {
    lastFocus = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.hidden = false;
    const menu = document.getElementById("wt-more-menu");
    const toggle = document.getElementById("wt-more-toggle");
    if (menu) menu.hidden = true;
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    render();
    byId("wt-shifts-close").focus();
  });
  byId("wt-shifts-close").addEventListener("click", close);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !dialog.hidden) close();
  });
  monthSelect.addEventListener("change", () => { month = Number(monthSelect.value); render(); });
  yearInput.addEventListener("change", () => {
    const next = Number(yearInput.value);
    if (Number.isInteger(next) && next >= 2000 && next <= 2099) year = next;
    render();
  });
  byId("wt-shifts-clear").addEventListener("click", () => {
    if (Object.keys(selections).length && !window.confirm("Clear every shift for " + MONTHS[month - 1] + " " + year + "?")) return;
    selections = {};
    persist();
    render();
  });
  byId("wt-shifts-export").addEventListener("click", () => {
    if (!Object.keys(selections).length) return;
    const blob = new Blob([createICS(selections)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Mimi_Work_Schedule_" + year + "-" + pad(month) + ".ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    byId("wt-shifts-status").textContent = "File generated. Open the .ics download on your iPhone.";
  });
})();

