# Handoff — Morephrem "Datum reserveren"

Kort overzicht zodat je (of Claude Code op je Mac) direct verder kan.

## Wat dit is
Een losse, gerichte web-pagina die hoort bij de hoofdsite **morephrem.com**:
bezoekers reserveren in een paar stappen een datum voor een huwelijk, feest of
zaalhuur. Het is een **werkend prototype** (geen server): aanvragen worden nu
lokaal in de browser bewaard (`localStorage`).

## Techniek
- Statische site: `index.html` + `css/styles.css` + `js/app.js` (geen build-stap)
- Apple-geïnspireerde stijl (SF Pro systeemfont), light + dark mode
- Stapsgewijze wizard met eigen hash-URL per stap (`#type`, `#datum`, …)

## Stappen in de flow
1. **Type** — waarvoor (huwelijk / zaal huren / feest / anders)
2. **Datum** — iOS-achtige agenda met beschikbaar/bezet
3. **Arrangement** — pakketten (inbegrepen + vanaf-prijs) + optionele extra's, met live prijsindicatie
4. **Gegevens** — naam, e-mail, telefoon, gasten, opmerking
5. **Controleren** — overzicht + prijsindicatie → versturen
6. **Klaar** — geanimeerde bevestiging

## Lokaal bekijken
```bash
python3 -m http.server 8000   # open http://localhost:8000
```

## Makkelijk aan te passen (voorbeeldinhoud)
- **Accentkleur / huisstijl:** bovenaan in `css/styles.css` → `--accent`, `--accent-hover`
- **Pakketten & extra's + prijzen:** bovenaan in `js/app.js` → `PACKAGES` en `EXTRAS` (nu indicatieve voorbeelden)
- **Voorbeeld-bezette datums:** functie `seedBlockedDates()` in `js/app.js`
- **Locatienaam / terug-link:** in `index.html`

## Datamodel van een aanvraag (voor later Supabase)
Elke aanvraag heeft: `name, eventType, email, phone, date (YYYY-MM-DD),
guests, message, package, extras[], priceFrom, status, createdAt`.
Overzetten naar een echte database is straks een kleine stap (structuur staat er al).

## Roadmap (afgesproken, komt later)
- [ ] **Echte inhoud** — jullie pakketten, prijzen, teksten, locatienaam
- [ ] **Huisstijl** — accentkleur/logo van morephrem.com
- [ ] **Aanvragen centraal ontvangen** — database (Supabase) i.p.v. localStorage
- [ ] **Native app voor beheer (iOS/macOS, Swift)** — aanvragen ontvangen/beheren
- [ ] **Live zetten / insluiten** op een morephrem-pagina

## Iconen
Stijl = **SF Symbols** (Apple). Let op de licentie:
- **Web (deze pagina):** SF Symbols mag niet direct op het web → iconen worden
  nagetekend als inline-SVG in dezelfde lijnstijl (werkt in light/dark).
- **Native app (later):** SF Symbols mág daar wél, gebruik ze op naam, bv.
  `Image(systemName: "calendar.badge.checkmark")`.

## Branch
Ontwikkeling staat op branch: `claude/determined-cannon-lqk1ls`
