/* =========================================================
   Landgoed Bloesemhof — front-end logica
   - Interactieve agenda (kalender) met datumselectie
   - Boekingsaanvragen opgeslagen in localStorage
   ========================================================= */

(function () {
  "use strict";

  // ---------- constanten ----------
  var STORAGE_KEY = "bloesemhof_bookings_v1";
  var MONTHS_NL = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december"
  ];
  var DAYS_NL = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

  // Voorbeeld: een paar dagen die al "bezet" zijn, zodat de agenda realistisch oogt.
  // Deze worden relatief ten opzichte van vandaag gegenereerd.
  function seedBlockedDates() {
    var today = new Date();
    var blocked = [];
    // een aantal willekeurige-ogende bezette zaterdagen de komende maanden
    var offsets = [12, 26, 47, 61, 75, 96, 110];
    offsets.forEach(function (d) {
      var dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
      blocked.push(isoDate(dt));
    });
    return blocked;
  }

  // ---------- state ----------
  var viewDate = new Date();          // welke maand tonen we
  viewDate.setDate(1);
  var selectedISO = null;             // gekozen datum (YYYY-MM-DD)
  var blockedDates = seedBlockedDates();
  var bookings = loadBookings();

  // ---------- DOM refs ----------
  var calGrid       = document.getElementById("calGrid");
  var calTitle      = document.getElementById("calTitle");
  var prevBtn       = document.getElementById("prevMonth");
  var nextBtn       = document.getElementById("nextMonth");
  var selectionDate = document.getElementById("selectionDate");
  var selectionHint = document.getElementById("selectionHint");
  var toFormBtn     = document.getElementById("toFormBtn");
  var form          = document.getElementById("bookingForm");
  var fDate         = document.getElementById("fDate");
  var formError     = document.getElementById("formError");
  var confirmation  = document.getElementById("confirmation");
  var confirmText   = document.getElementById("confirmationText");
  var newRequestBtn = document.getElementById("newRequestBtn");
  var requestsList  = document.getElementById("requestsList");
  var toast         = document.getElementById("toast");

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
    var parts = iso.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
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
    } catch (e) {
      return [];
    }
  }

  function saveBookings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch (e) {
      /* opslag niet beschikbaar — negeer stil */
    }
  }

  function isDateTaken(iso) {
    if (blockedDates.indexOf(iso) !== -1) return true;
    return bookings.some(function (b) { return b.date === iso; });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    // force reflow zodat de transitie speelt
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
  function renderCalendar() {
    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();
    calTitle.textContent = MONTHS_NL[month] + " " + year;

    calGrid.innerHTML = "";

    // welke weekdag is de 1e? (maandag = start). JS: 0=zo..6=za
    var firstDay = new Date(year, month, 1).getDay();
    var leading = (firstDay + 6) % 7; // aantal lege cellen vóór dag 1
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
        cell.title = "Deze datum is niet meer beschikbaar";
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
    selectionHint.textContent = "Mooie keuze! Ga verder om jullie aanvraag te versturen.";
    toFormBtn.hidden = false;
    if (fDate) fDate.value = iso;
    renderCalendar();
  }

  // =========================================================
  //  Boekingsformulier
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
      guests:    form.guests.value,
      message:   form.message.value.trim()
    };

    // validatie
    if (!data.name || !data.email || !data.date || !data.guests) {
      return showError("Vul alle verplichte velden (*) in.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return showError("Vul een geldig e-mailadres in.");
    }
    var chosen = parseISO(data.date);
    if (chosen < startOfToday()) {
      return showError("Kies een datum in de toekomst.");
    }
    if (isDateTaken(data.date)) {
      return showError("Helaas, deze datum is inmiddels bezet. Kies een andere dag in de agenda.");
    }

    // opslaan
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

    // UI bijwerken
    form.hidden = true;
    confirmText.textContent =
      "Bedankt " + data.name + "! Jullie aanvraag voor " + formatLongNL(data.date) +
      " is ontvangen. We nemen binnen 2 werkdagen contact op via " + data.email + ".";
    confirmation.hidden = false;
    selectedISO = null;
    renderCalendar();
    renderRequests();
    showToast("Aanvraag opgeslagen ✓");
    confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
    formError.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetForm() {
    form.reset();
    form.hidden = false;
    confirmation.hidden = true;
    selectionDate.textContent = "Nog geen datum gekozen";
    selectionHint.textContent = "Selecteer hierboven een beschikbare (groene) dag in de agenda.";
    toFormBtn.hidden = true;
  }

  // =========================================================
  //  Overzicht van aanvragen
  // =========================================================
  function renderRequests() {
    requestsList.innerHTML = "";

    if (!bookings.length) {
      var empty = document.createElement("p");
      empty.className = "requests-empty";
      empty.textContent = "Er zijn nog geen aanvragen gemaakt op dit apparaat.";
      requestsList.appendChild(empty);
      return;
    }

    // sorteer op datum
    var sorted = bookings.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    });

    sorted.forEach(function (b) {
      var card = document.createElement("div");
      card.className = "request-card";

      var info = document.createElement("div");
      info.className = "request-info";
      var h = document.createElement("h4");
      h.textContent = b.name;
      var meta = document.createElement("p");
      meta.textContent = formatLongNL(b.date) + " · " + b.eventType + " · " + b.guests + " gasten";
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
  //  Navigatie (mobiel menu) + jaartal
  // =========================================================
  function initNav() {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  // =========================================================
  //  Init
  // =========================================================
  function init() {
    // kalender kan niet vóór de huidige maand
    prevBtn.addEventListener("click", function () {
      var minMonth = new Date();
      minMonth.setDate(1);
      minMonth.setHours(0, 0, 0, 0);
      var candidate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
      if (candidate >= minMonth) {
        viewDate = candidate;
        renderCalendar();
      }
    });
    nextBtn.addEventListener("click", function () {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
      renderCalendar();
    });

    // formulier: geen datums in verleden toestaan
    if (fDate) fDate.min = isoDate(startOfToday());

    form.addEventListener("submit", handleSubmit);
    newRequestBtn.addEventListener("click", resetForm);

    initNav();
    renderCalendar();
    renderRequests();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
