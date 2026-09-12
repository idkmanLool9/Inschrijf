/* =========================================================
   Morephrem — Datum reserveren
   - Interactieve agenda (kalender) met datumselectie
   - Aanvragen opgeslagen in localStorage (dit apparaat)
   ========================================================= */

(function () {
  "use strict";

  var STORAGE_KEY = "morephrem_datum_v1";
  var MONTHS_NL = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december"
  ];
  var DAYS_NL = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

  // Voorbeeld: een paar reeds bezette dagen zodat de agenda realistisch oogt.
  // Verwijder deze functie-inhoud (return []) om met een lege agenda te starten.
  function seedBlockedDates() {
    var today = new Date();
    var blocked = [];
    [12, 26, 47, 61, 75, 96, 110].forEach(function (d) {
      var dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
      blocked.push(isoDate(dt));
    });
    return blocked;
  }

  // ---------- state ----------
  var viewDate = new Date();
  viewDate.setDate(1);
  var selectedISO = null;
  var blockedDates = seedBlockedDates();
  var bookings = loadBookings();

  // ---------- DOM ----------
  var calGrid       = document.getElementById("calGrid");
  var calTitle      = document.getElementById("calTitle");
  var prevBtn       = document.getElementById("prevMonth");
  var nextBtn       = document.getElementById("nextMonth");
  var selectionDate = document.getElementById("selectionDate");
  var form          = document.getElementById("bookingForm");
  var fDate         = document.getElementById("fDate");
  var formError     = document.getElementById("formError");
  var confirmation  = document.getElementById("confirmation");
  var confirmText   = document.getElementById("confirmationText");
  var newRequestBtn = document.getElementById("newRequestBtn");
  var requestsList  = document.getElementById("requestsList");
  var toast         = document.getElementById("toast");
  var themeToggle   = document.getElementById("themeToggle");
  var THEME_KEY     = "morephrem_theme";

  // =========================================================
  //  Hulpfuncties
  // =========================================================
  function isoDate(dateObj) {
    var y = dateObj.getFullYear();
    var m = String(dateObj.getMonth() + 1).padStart(2, "0");
    var d = String(dateObj.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function parseISO(iso) {
    var p = iso.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function formatLongNL(iso) {
    var d = parseISO(iso);
    return DAYS_NL[d.getDay()] + " " + d.getDate() + " " + MONTHS_NL[d.getMonth()] + " " + d.getFullYear();
  }

  function startOfToday() {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function loadBookings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveBookings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings)); }
    catch (e) { /* opslag niet beschikbaar */ }
  }

  function isDateTaken(iso) {
    if (blockedDates.indexOf(iso) !== -1) return true;
    return bookings.some(function (b) { return b.date === iso; });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.hidden = true; }, 300);
    }, 2800);
  }

  // =========================================================
  //  Kalender
  // =========================================================
  function currentMonthStart() {
    var m = new Date();
    m.setDate(1);
    m.setHours(0, 0, 0, 0);
    return m;
  }

  function renderCalendar() {
    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();
    calTitle.textContent = MONTHS_NL[month] + " " + year;

    // "vorige maand" uitschakelen wanneer we in de huidige maand zitten
    prevBtn.disabled = viewDate <= currentMonthStart();

    calGrid.innerHTML = "";

    var firstDay = new Date(year, month, 1).getDay();
    var leading = (firstDay + 6) % 7;               // maandag als eerste kolom
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = startOfToday();
    var todayISO = isoDate(today);

    for (var i = 0; i < leading; i++) {
      var empty = document.createElement("div");
      empty.className = "day empty";
      calGrid.appendChild(empty);
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var cellDate = new Date(year, month, day);
      var iso = isoDate(cellDate);
      var cell = document.createElement("div");
      cell.className = "day";
      cell.textContent = day;

      if (iso === todayISO) cell.classList.add("today");

      if (cellDate < today) {
        cell.classList.add("past");
      } else if (isDateTaken(iso)) {
        cell.classList.add("booked");
        cell.title = "Niet meer beschikbaar";
      } else {
        cell.classList.add("available");
        cell.setAttribute("role", "button");
        cell.setAttribute("tabindex", "0");
        cell.title = "Kies " + formatLongNL(iso);
        (function (isoValue) {
          cell.addEventListener("click", function () { selectDate(isoValue); });
          cell.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDate(isoValue); }
          });
        })(iso);
      }

      if (iso === selectedISO) cell.classList.add("selected");
      calGrid.appendChild(cell);
    }
  }

  function selectDate(iso) {
    selectedISO = iso;
    selectionDate.textContent = formatLongNL(iso);
    if (fDate) fDate.value = iso;
    renderCalendar();
  }

  // =========================================================
  //  Aanvraagformulier
  // =========================================================
  function handleSubmit(e) {
    e.preventDefault();
    formError.hidden = true;

    var data = {
      name:      form.name.value.trim(),
      eventType: form.eventType.value,
      email:     form.email.value.trim(),
      phone:     form.phone.value.trim(),
      date:      form.date.value,
      guests:    form.guests.value.trim(),
      message:   form.message.value.trim()
    };

    if (!data.name || !data.email || !data.date) {
      return showError("Vul je naam, e-mail en een datum in.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return showError("Vul een geldig e-mailadres in.");
    }
    if (parseISO(data.date) < startOfToday()) {
      return showError("Kies een datum in de toekomst.");
    }
    if (isDateTaken(data.date)) {
      return showError("Deze datum is inmiddels bezet. Kies een andere dag in de agenda.");
    }

    var booking = {
      id: "bk_" + Date.now(),
      name: data.name,
      eventType: data.eventType,
      email: data.email,
      phone: data.phone,
      date: data.date,
      guests: data.guests,
      message: data.message,
      status: "Aangevraagd",
      createdAt: new Date().toISOString()
    };
    bookings.push(booking);
    saveBookings();

    form.hidden = true;
    confirmText.textContent =
      "Bedankt " + data.name + "! Je aanvraag voor " + formatLongNL(data.date) +
      " is ontvangen. We nemen binnen 2 werkdagen contact op via " + data.email + ".";
    confirmation.hidden = false;
    selectedISO = null;
    renderCalendar();
    renderRequests();
    showToast("Aanvraag opgeslagen ✓");
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
  }

  function resetForm() {
    form.reset();
    form.hidden = false;
    confirmation.hidden = true;
    selectionDate.textContent = "Nog geen datum gekozen";
  }

  // =========================================================
  //  Overzicht van aanvragen
  // =========================================================
  function renderRequests() {
    requestsList.innerHTML = "";

    if (!bookings.length) {
      var empty = document.createElement("p");
      empty.className = "requests-empty";
      empty.textContent = "Nog geen aanvragen gemaakt op dit apparaat.";
      requestsList.appendChild(empty);
      return;
    }

    bookings.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; })
      .forEach(function (b) {
        var card = document.createElement("div");
        card.className = "request-card";

        var info = document.createElement("div");
        info.className = "request-info";
        var h = document.createElement("h4");
        h.textContent = b.name;
        var meta = document.createElement("p");
        var guestsTxt = b.guests ? " · " + b.guests + " gasten" : "";
        meta.textContent = formatLongNL(b.date) + " · " + b.eventType + guestsTxt;
        var badge = document.createElement("span");
        badge.className = "request-badge";
        badge.textContent = b.status;
        info.appendChild(h);
        info.appendChild(meta);
        info.appendChild(badge);

        var cancel = document.createElement("button");
        cancel.className = "request-cancel";
        cancel.textContent = "Annuleren";
        cancel.addEventListener("click", function () { cancelBooking(b.id); });

        card.appendChild(info);
        card.appendChild(cancel);
        requestsList.appendChild(card);
      });
  }

  function cancelBooking(id) {
    var b = bookings.find(function (x) { return x.id === id; });
    if (!b) return;
    if (!window.confirm("Aanvraag van " + b.name + " op " + formatLongNL(b.date) + " annuleren?")) return;
    bookings = bookings.filter(function (x) { return x.id !== id; });
    saveBookings();
    renderRequests();
    renderCalendar();
    showToast("Aanvraag geannuleerd");
  }

  // =========================================================
  //  Thema (licht / donker)
  // =========================================================
  function prefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function currentTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr;
    return prefersDark() ? "dark" : "light";
  }

  function applyStoredTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === "dark" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  }

  function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  }

  // =========================================================
  //  Init
  // =========================================================
  function init() {
    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

    prevBtn.addEventListener("click", function () {
      if (prevBtn.disabled) return;
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
      renderCalendar();
    });
    nextBtn.addEventListener("click", function () {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
      renderCalendar();
    });

    if (fDate) fDate.min = isoDate(startOfToday());

    form.addEventListener("submit", handleSubmit);
    newRequestBtn.addEventListener("click", resetForm);

    renderCalendar();
    renderRequests();
  }

  // pas een opgeslagen thema meteen toe (vóór paint) om flikkeren te voorkomen
  applyStoredTheme();

  document.addEventListener("DOMContentLoaded", init);
})();
