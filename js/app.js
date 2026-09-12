/* =========================================================
   Morephrem — Datum reserveren (stapsgewijze wizard)
   - Stappen als aparte "pagina's" met eigen hash (#type, #datum, …)
   - Vloeiende overgangen, voortgangsbalk, geanimeerde bevestiging
   - Aanvragen opgeslagen in localStorage (dit apparaat)
   ========================================================= */

(function () {
  "use strict";

  var STORAGE_KEY = "morephrem_datum_v1";
  var THEME_KEY   = "morephrem_theme";
  var MONTHS_NL = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  var DAYS_NL   = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];

  // Volgorde van de wizard-stappen (voor voortgang + richting van de animatie)
  var FLOW  = ["type", "datum", "gegevens", "controleren"];
  var EXTRA = ["klaar", "aanvragen"];
  var ALL   = FLOW.concat(EXTRA);

  // Voorbeeld: enkele reeds bezette dagen (return [] voor een lege agenda)
  function seedBlockedDates() {
    var today = new Date(), out = [];
    [12, 26, 47, 61, 75, 96, 110].forEach(function (d) {
      out.push(isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + d)));
    });
    return out;
  }

  // ---------- state ----------
  var viewDate = new Date(); viewDate.setDate(1);
  var blockedDates = seedBlockedDates();
  var bookings = loadBookings();
  var submitted = false;
  var rendered = null;           // laatst getoonde stap
  var state = { eventType: null, date: null, name: "", email: "", phone: "", guests: "", message: "" };

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var stepper     = $("stepper");
  var stepperFill = $("stepperFill");
  var calGrid = $("calGrid"), calTitle = $("calTitle"), prevBtn = $("prevMonth"), nextBtn = $("nextMonth");
  var selectionDate = $("selectionDate"), chosenInline = $("chosenInline");
  var datumNext = $("datumNext"), typeGrid = $("typeGrid");
  var form = $("bookingForm"), formError = $("formError");
  var reviewList = $("reviewList"), confirmText = $("confirmationText");
  var requestsList = $("requestsList");
  var newRequestBtn = $("newRequestBtn"), themeToggle = $("themeToggle"), toast = $("toast");
  var steps = {};
  ALL.forEach(function (s) { steps[s] = document.querySelector('.step[data-step="' + s + '"]'); });

  // =========================================================
  //  Hulpfuncties
  // =========================================================
  function isoDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }
  function parseISO(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
  function formatLongNL(iso) {
    var d = parseISO(iso);
    return DAYS_NL[d.getDay()] + " " + d.getDate() + " " + MONTHS_NL[d.getMonth()] + " " + d.getFullYear();
  }
  function startOfToday() { var t = new Date(); t.setHours(0,0,0,0); return t; }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function loadBookings() {
    try { var r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }
  function saveBookings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings)); } catch (e) {}
  }
  function isDateTaken(iso) {
    return blockedDates.indexOf(iso) !== -1 || bookings.some(function (b) { return b.date === iso; });
  }

  function showToast(msg) {
    toast.textContent = msg; toast.hidden = false; void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () { toast.hidden = true; }, 300);
    }, 2800);
  }

  // =========================================================
  //  Router / stappen
  // =========================================================
  function gegevensComplete() { return state.name && validEmail(state.email); }

  function canAccess(step) {
    switch (step) {
      case "type":        return true;
      case "datum":       return !!state.eventType;
      case "gegevens":    return !!state.eventType && !!state.date;
      case "controleren": return !!state.eventType && !!state.date && gegevensComplete();
      case "klaar":       return submitted;
      case "aanvragen":   return true;
      default:            return false;
    }
  }

  // dichtstbijzijnde toegankelijke stap (val terug naar eerste onvolledige)
  function resolveStep(step) {
    if (ALL.indexOf(step) === -1) return "type";
    if (canAccess(step)) return step;
    for (var i = 0; i < FLOW.length; i++) { if (!canAccess(FLOW[i])) return FLOW[i]; }
    return "type";
  }

  function orderIndex(step) {
    var i = FLOW.indexOf(step);
    if (i !== -1) return i;
    if (step === "klaar") return FLOW.length;      // na de flow
    return -1;                                     // aanvragen: neutraal
  }

  function goTo(step) {
    if (("#" + step) === location.hash) { route(); }   // zelfde hash: forceer render
    else { location.hash = step; }                     // hashchange -> route()
  }

  function route() {
    var step = resolveStep((location.hash || "#type").slice(1));
    if (("#" + step) !== location.hash) { location.replace("#" + step); return; }

    var prevI = orderIndex(rendered), nextI = orderIndex(step);
    var dir = (rendered && prevI !== -1 && nextI !== -1 && nextI < prevI) ? "back" : "fwd";
    renderStep(step, dir);
    rendered = step;
  }

  function renderStep(step, dir) {
    ALL.forEach(function (s) {
      var el = steps[s];
      if (!el) return;
      el.classList.remove("anim-fwd", "anim-back");
      el.hidden = (s !== step);
    });
    var active = steps[step];
    if (active) {
      void active.offsetWidth;                         // herstart animatie
      active.classList.add(dir === "back" ? "anim-back" : "anim-fwd");
    }

    // stepper alleen tonen binnen de flow
    stepper.hidden = FLOW.indexOf(step) === -1;
    updateStepper(step);

    // per-stap voorbereiden
    if (step === "datum")       { renderCalendar(); refreshChosen(); }
    if (step === "gegevens")    { fillForm(); }
    if (step === "controleren") { renderReview(); }
    if (step === "aanvragen")   { renderRequests(); }

    window.scrollTo({ top: 0, behavior: rendered ? "smooth" : "auto" });
  }

  function updateStepper(step) {
    var activeI = FLOW.indexOf(step);
    if (activeI === -1 && step === "klaar") activeI = FLOW.length; // alles voltooid
    FLOW.forEach(function (s, i) {
      var node = document.querySelector('.snode[data-step="' + s + '"]');
      if (!node) return;
      var st = i < activeI ? "done" : (i === activeI ? "current" : "todo");
      node.setAttribute("data-state", st);
      // vergrendel stappen die (nog) niet toegankelijk zijn
      if (canAccess(s)) node.removeAttribute("data-locked");
      else node.setAttribute("data-locked", "");
    });
    var pct = FLOW.length > 1 ? Math.max(0, Math.min(activeI, FLOW.length - 1)) / (FLOW.length - 1) : 0;
    stepperFill.style.width = (pct * 100) + "%";
  }

  // =========================================================
  //  Stap 1 — type
  // =========================================================
  function initTypeCards() {
    typeGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".type-card");
      if (!card) return;
      state.eventType = card.getAttribute("data-value");
      Array.prototype.forEach.call(typeGrid.children, function (c) { c.classList.toggle("selected", c === card); });
      // korte pauze zodat de selectie-animatie zichtbaar is, dan door
      setTimeout(function () { goTo("datum"); }, 260);
    });
  }
  function markTypeSelection() {
    Array.prototype.forEach.call(typeGrid.children, function (c) {
      c.classList.toggle("selected", c.getAttribute("data-value") === state.eventType);
    });
  }

  // =========================================================
  //  Stap 2 — kalender
  // =========================================================
  function currentMonthStart() { var m = new Date(); m.setDate(1); m.setHours(0,0,0,0); return m; }

  function renderCalendar() {
    var year = viewDate.getFullYear(), month = viewDate.getMonth();
    calTitle.textContent = MONTHS_NL[month] + " " + year;
    prevBtn.disabled = viewDate <= currentMonthStart();
    calGrid.innerHTML = "";

    var leading = (new Date(year, month, 1).getDay() + 6) % 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = startOfToday(), todayISO = isoDate(today);

    for (var i = 0; i < leading; i++) {
      var em = document.createElement("div"); em.className = "day empty"; calGrid.appendChild(em);
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var cellDate = new Date(year, month, day), iso = isoDate(cellDate);
      var cell = document.createElement("div");
      cell.className = "day"; cell.textContent = day;
      if (iso === todayISO) cell.classList.add("today");

      if (cellDate < today) {
        cell.classList.add("past");
      } else if (isDateTaken(iso)) {
        cell.classList.add("booked"); cell.title = "Niet meer beschikbaar";
      } else {
        cell.classList.add("available");
        cell.setAttribute("role", "button"); cell.setAttribute("tabindex", "0");
        cell.title = "Kies " + formatLongNL(iso);
        (function (v) {
          cell.addEventListener("click", function () { selectDate(v); });
          cell.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDate(v); }
          });
        })(iso);
      }
      if (iso === state.date) cell.classList.add("selected");
      calGrid.appendChild(cell);
    }
  }

  function selectDate(iso) {
    state.date = iso;
    renderCalendar();
    refreshChosen();
  }
  function refreshChosen() {
    if (state.date) {
      selectionDate.textContent = formatLongNL(state.date);
      chosenInline.hidden = false;
      datumNext.disabled = false;
    } else {
      chosenInline.hidden = true;
      datumNext.disabled = true;
    }
  }

  // =========================================================
  //  Stap 3 — gegevens
  // =========================================================
  function fillForm() {
    form.name.value = state.name;
    form.email.value = state.email;
    form.phone.value = state.phone;
    form.guests.value = state.guests;
    form.message.value = state.message;
    formError.hidden = true;
  }
  function collectForm() {
    state.name    = form.name.value.trim();
    state.email   = form.email.value.trim();
    state.phone   = form.phone.value.trim();
    state.guests  = form.guests.value.trim();
    state.message = form.message.value.trim();
  }
  function validateGegevens() {
    collectForm();
    if (!state.name)  { return "Vul je naam in."; }
    if (!state.email) { return "Vul je e-mailadres in."; }
    if (!validEmail(state.email)) { return "Vul een geldig e-mailadres in."; }
    return null;
  }

  // =========================================================
  //  Stap 4 — controleren
  // =========================================================
  function renderReview() {
    var rows = [
      { key: "Type",     val: state.eventType,               edit: "type" },
      { key: "Datum",    val: state.date ? formatLongNL(state.date) : "—", edit: "datum" },
      { key: "Naam",     val: state.name,                    edit: "gegevens" },
      { key: "E-mail",   val: state.email,                   edit: "gegevens" },
      { key: "Telefoon", val: state.phone || "—",            edit: "gegevens" },
      { key: "Gasten",   val: state.guests || "—",           edit: "gegevens" },
      { key: "Opmerking",val: state.message || "—",          edit: "gegevens" }
    ];
    reviewList.innerHTML = "";
    rows.forEach(function (r) {
      var row = document.createElement("div"); row.className = "review-row";
      var k = document.createElement("span"); k.className = "review-key"; k.textContent = r.key;
      var right = document.createElement("div");
      right.style.display = "flex"; right.style.alignItems = "center"; right.style.gap = ".6rem";
      var v = document.createElement("span"); v.className = "review-val"; v.textContent = r.val;
      var edit = document.createElement("button"); edit.className = "review-edit"; edit.type = "button";
      edit.textContent = "Wijzig"; edit.addEventListener("click", function () { goTo(r.edit); });
      right.appendChild(v); right.appendChild(edit);
      row.appendChild(k); row.appendChild(right);
      reviewList.appendChild(row);
    });
  }

  function submitBooking() {
    if (!canAccess("controleren")) { goTo(resolveStep("controleren")); return; }
    if (isDateTaken(state.date)) {
      showToast("Deze datum is inmiddels bezet.");
      state.date = null; goTo("datum"); return;
    }
    var booking = {
      id: "bk_" + Date.now(),
      name: state.name, eventType: state.eventType, email: state.email,
      phone: state.phone, date: state.date, guests: state.guests, message: state.message,
      status: "Aangevraagd", createdAt: new Date().toISOString()
    };
    bookings.push(booking);
    saveBookings();
    submitted = true;
    confirmText.textContent =
      "Bedankt " + state.name + "! Je aanvraag voor " + formatLongNL(state.date) +
      " is ontvangen. We nemen binnen 2 werkdagen contact op via " + state.email + ".";
    showToast("Aanvraag opgeslagen ✓");
    goTo("klaar");
  }

  function resetFlow() {
    submitted = false;
    state = { eventType: null, date: null, name: "", email: "", phone: "", guests: "", message: "" };
    markTypeSelection();
    if (form) form.reset();
    goTo("type");
  }

  // =========================================================
  //  Mijn aanvragen
  // =========================================================
  function renderRequests() {
    requestsList.innerHTML = "";
    if (!bookings.length) {
      var e = document.createElement("p"); e.className = "requests-empty";
      e.textContent = "Nog geen aanvragen gemaakt op dit apparaat.";
      requestsList.appendChild(e); return;
    }
    bookings.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (b) {
      var card = document.createElement("div"); card.className = "request-card";
      var info = document.createElement("div"); info.className = "request-info";
      var h = document.createElement("h4"); h.textContent = b.name;
      var meta = document.createElement("p");
      meta.textContent = formatLongNL(b.date) + " · " + b.eventType + (b.guests ? " · " + b.guests + " gasten" : "");
      var badge = document.createElement("span"); badge.className = "request-badge"; badge.textContent = b.status;
      info.appendChild(h); info.appendChild(meta); info.appendChild(badge);
      var cancel = document.createElement("button"); cancel.className = "request-cancel";
      cancel.textContent = "Annuleren";
      cancel.addEventListener("click", function () { cancelBooking(b.id); });
      card.appendChild(info); card.appendChild(cancel);
      requestsList.appendChild(card);
    });
  }
  function cancelBooking(id) {
    var b = bookings.find(function (x) { return x.id === id; });
    if (!b || !window.confirm("Aanvraag van " + b.name + " op " + formatLongNL(b.date) + " annuleren?")) return;
    bookings = bookings.filter(function (x) { return x.id !== id; });
    saveBookings(); renderRequests(); showToast("Aanvraag geannuleerd");
  }

  // =========================================================
  //  Thema
  // =========================================================
  function prefersDark() { return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function currentTheme() { return document.documentElement.getAttribute("data-theme") || (prefersDark() ? "dark" : "light"); }
  function applyStoredTheme() {
    var s = null; try { s = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (s === "dark" || s === "light") document.documentElement.setAttribute("data-theme", s);
  }
  function toggleTheme() {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  }

  // =========================================================
  //  Init
  // =========================================================
  function onWizardClick(e) {
    var goEl = e.target.closest("[data-goto]");
    if (goEl) { e.preventDefault(); goTo(goEl.getAttribute("data-goto")); return; }
    var nextEl = e.target.closest("[data-next]");
    if (nextEl) {
      e.preventDefault();
      var s = nextEl.getAttribute("data-next");
      if (s === "type" && state.eventType) goTo("datum");
      else if (s === "datum" && state.date) goTo("gegevens");
      else if (s === "gegevens") {
        var err = validateGegevens();
        if (err) { formError.textContent = err; formError.hidden = false; }
        else { formError.hidden = true; goTo("controleren"); }
      }
      else if (s === "controleren") submitBooking();
    }
  }

  function init() {
    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

    prevBtn.addEventListener("click", function () {
      if (prevBtn.disabled) return;
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); renderCalendar();
    });
    nextBtn.addEventListener("click", function () {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); renderCalendar();
    });

    initTypeCards();
    document.querySelector("main.wizard").addEventListener("click", onWizardClick);
    form.addEventListener("submit", function (e) { e.preventDefault(); }); // afhandeling via data-next
    newRequestBtn.addEventListener("click", resetFlow);

    window.addEventListener("hashchange", route);
    route();
  }

  applyStoredTheme();
  document.addEventListener("DOMContentLoaded", init);
})();
