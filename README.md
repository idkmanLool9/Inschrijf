# Landgoed Bloesemhof — Trouwlocatie & Zaalverhuur

Een website voor het verhuren van een trouw-/feestlocatie. Bezoekers bekijken de
**agenda**, kiezen een **datum** en versturen een **aanvraag** voor hun bruiloft.

Dit is een **werkend prototype**: alles draait in de browser en aanvragen worden
lokaal opgeslagen (`localStorage`). Er is (nog) geen server of database nodig.

## Functies

- **Agenda / kalender** met maandnavigatie
  - groene dagen = beschikbaar, rode dagen = bezet, verleden dagen niet klikbaar
  - klik een dag aan om deze te selecteren
- **Datumselectie** die automatisch het aanvraagformulier invult
- **Aanvraagformulier** (naam, type gelegenheid, contact, datum, aantal gasten, wensen)
  met validatie en een bevestiging
- **Overzicht** van gemaakte aanvragen, met de mogelijkheid om te annuleren
- Volledig **responsive** (mobiel-vriendelijk) en in het Nederlands

## Bestanden

```
index.html      # structuur en inhoud van de pagina
css/styles.css  # vormgeving (romantische, elegante stijl)
js/app.js       # kalenderlogica, datumselectie, opslag van aanvragen
```

## Lokaal bekijken

Open `index.html` direct in de browser, of start een kleine webserver:

```bash
# met Python
python3 -m http.server 8000
# open daarna http://localhost:8000
```

## Aanpassen

- **Naam / adres / contact van de locatie**: pas de teksten aan in `index.html`
  (o.a. `.brand-name`, de hero-sectie en de footer).
- **Kleuren en stijl**: bovenaan in `css/styles.css` staan de kleuren als
  CSS-variabelen (`--blush`, `--gold`, `--green`, …).
- **Voorbeeld-bezette datums**: in `js/app.js` in de functie `seedBlockedDates()`.

## Volgende stappen (optioneel)

- Aanvragen bewaren in een echte database (bv. Supabase), zodat ze op elk
  apparaat zichtbaar zijn en beheerd kunnen worden.
- E-mailbevestiging automatisch versturen.
- Beheerpagina voor de eigenaar om aanvragen te bevestigen/afwijzen.
