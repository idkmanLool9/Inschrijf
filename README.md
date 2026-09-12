# Morephrem — Datum reserveren

Een **losse, gerichte pagina** die hoort bij de hoofdsite
[morephrem.com](https://morephrem.com). Doel: bezoekers kiezen een
**beschikbare datum** in de agenda en versturen een **aanvraag** (bijv. voor
een huwelijk of het huren van de zaal).

Dit is een **werkend prototype**: alles draait in de browser en aanvragen
worden lokaal opgeslagen (`localStorage`). Er is (nog) geen server of database.

## Functies

- **Agenda / kalender** met maandnavigatie
  - groen = beschikbaar, rood = bezet, verleden = niet klikbaar
  - "vorige maand" is uitgeschakeld op de huidige maand
- **Datumselectie** die het aanvraagformulier automatisch invult
- Compact **aanvraagformulier** (naam, type, e-mail, telefoon, datum, gasten, opmerking) met validatie en bevestiging
- **Overzicht** van je aanvragen met de mogelijkheid om te annuleren
- **Responsive** en volledig in het Nederlands

## Bestanden

```
index.html      # de pagina (agenda + aanvraag)
css/styles.css  # vormgeving
js/app.js       # kalender, datumselectie, opslag
```

## Lokaal bekijken

Open `index.html` in de browser, of start een kleine webserver:

```bash
python3 -m http.server 8000   # open daarna http://localhost:8000
```

## Aansluiten op de huisstijl van morephrem.com

De vormgeving is bewust neutraal gehouden. Pas bovenaan in `css/styles.css`
de CSS-variabelen aan:

```css
--accent:      #9b2f4a;   /* hoofdkleur (knoppen, gekozen datum, links) */
--accent-dark: #822840;
```

- **Terug-link** naar de hoofdsite staat in `index.html` (`.back` en de footer).
- **Voorbeeld-bezette datums**: functie `seedBlockedDates()` in `js/app.js`
  (geef `[]` terug voor een lege agenda).

## Volgende stappen (optioneel)

- Aanvragen bewaren in een echte **database** (bv. Supabase) zodat ze niet per
  apparaat, maar centraal worden opgeslagen en beheerd kunnen worden.
- Automatische **e-mailbevestiging** bij een aanvraag.
- Als iframe **insluiten** op een pagina van morephrem.com.
