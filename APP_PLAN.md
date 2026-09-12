# Mor Ephrem — App & architectuur (plan)

Doel: één **Mor Ephrem-app** voor de gemeenschap (nieuws, agenda, contact) met
**zaalverhuur/reserveren** als module. Mensen boeken via **website óf app**, alle
aanvragen komen **centraal** binnen, en de organisatie **beheert ze in de app**.

## 1. Architectuur (het grote plaatje)

```
   Website (bestaat al)  ─┐
                          ├──►  Supabase  ◄──  Mor Ephrem-app (beheer)
   Mor Ephrem-app        ─┘   (database +
   (publiek)                   auth + realtime)
```

- **Supabase** = de centrale plek waar aanvragen (en later nieuws/agenda) leven.
  - Postgres database (de gegevens)
  - Auth (inloggen; onderscheid **bezoeker** vs **beheerder**)
  - Realtime (beheerders zien nieuwe aanvragen meteen binnenkomen)
- **iOS-app**: SwiftUI, `supabase-swift` package voor de verbinding.
- **Website**: de bestaande reserveringspagina schrijft straks naar dezelfde
  `reservations`-tabel (nu nog `localStorage`).

Niets van het huidige werk gaat verloren: website en app delen dezelfde database.

## 2. App-structuur (tabs)

| Tab | Voor wie | SF Symbol |
|-----|----------|-----------|
| Home / Nieuws | iedereen | `house` / `newspaper` |
| Agenda | iedereen | `calendar` |
| Zaal reserveren | iedereen | `calendar.badge.plus` |
| Beheer | alleen beheerders | `tray.full` / `checklist` |
| Info / Contact | iedereen | `info.circle` / `mappin.and.ellipse` |

Statussen van een aanvraag: `clock` (in behandeling), `checkmark.seal`
(bevestigd), `xmark.circle` (afgewezen).

## 3. Reserveren-module (zelfde flow als de website)
Type → Datum → Arrangement → Gegevens → Controleren → verstuurd.
Beheer: aanvragen zien, **bevestigen/afwijzen**, en **datums blokkeren**.

## 4. Datamodel (Supabase-tabellen)
- **reservations**: `id, name, event_type, email, phone, date, guests, message,
  package, extras (jsonb), price_from, status, created_at`
- **packages**: `id, name, description, price_from, included (jsonb), active`
- **extras**: `id, name, price, active`
- **blocked_dates**: `id, date, reason`
- **profiles**: `id (= auth user), role ('admin' | 'user'), name`
- *(later)* **news**, **events** voor de bredere app

> De reserverings-velden komen 1-op-1 uit de huidige web-code (`js/app.js`),
> dus overzetten is klein werk.

## 5. Bouwvolgorde (aanbevolen)
1. **Supabase opzetten** + `reservations`-tabel, en de **bestaande website** laten
   schrijven naar Supabase i.p.v. `localStorage`.
   → Nu al: echte aanvragen komen binnen, nog vóór de app af is. Hoogste waarde.
2. **iOS-app skelet** (SwiftUI, tabs) + inloggen voor beheerders.
3. **Beheer-scherm**: aanvragen inzien, bevestigen/afwijzen, datums blokkeren.
4. **Reserveren in de app** (zelfde flow als website).
5. **Gemeenschaps-onderdelen**: nieuws & agenda.

## 6. Wat je nodig hebt (Mac)
- **Xcode** (App Store, gratis)
- **Claude Code** in Terminal in de projectmap (`claude`)
- Een **Supabase-account** (gratis te starten) → project + database-URL/keys
- *(voor publicatie later)* Apple Developer-account (≈ €99/jr)

## 7. SF Symbols
Alleen in de **app** direct te gebruiken (`Image(systemName: "…")`); op het **web**
worden gelijkende iconen als inline-SVG nagetekend (licentie). Zie `HANDOFF.md`.
