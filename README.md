# TurnAround

**Get out of Meyerland without driving into water.**

TurnAround is a phone web app for people in Meyerland (Houston, TX) during heavy rain or a
Brays Bayou flood. It answers one question: *is the water near me dangerous right now, and how
do I drive out without hitting it?*

- Live water levels from the official Brays Bayou gauges (NOAA), checked every 5 minutes
- A danger map that follows the bayou, colored by the National Weather Service flood stages
- **Get Me Out**: a driving route that stays out of the danger zones
- **Tested on Hurricane Harvey**: automated tests run the real Harvey water levels through the
  same code (`npm test`)
- Rain outlook from the National Weather Service
- Installs to a phone's home screen and still opens with no signal (last known readings)

Built for the Congressional App Challenge. Not an official warning service: follow the National
Weather Service, and call 911 in an emergency.

---

## Run it on your computer

You need [Node.js](https://nodejs.org) version 22 or newer.

```bash
npm install
cp .env.example .env.local      # then open .env.local and paste your ORS key (see below)
npm run dev
```

Open http://localhost:5173. In `npm run dev`, a **Test mode** panel appears at the bottom of
the home screen: use it to pretend a gauge is flooding and try Get Me Out on a dry day.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the unit tests (risk levels, zones, routing, Harvey numbers, colors) |
| `npm run build` | Type-checks and builds the site into `dist/` |
| `npm run check-gauges` | Compares our flood stages with NOAA's. Run before every demo. |
| `npm run cover` | Regenerates `cover/turnaround-cover.png` (600 x 800) |
| `npm run icons` | Regenerates the app icons in `public/icons` |
| `npm run fetch-harvey` | Re-downloads the Harvey data (already saved; you don't need this) |

## Get the routing key (free)

Routes and address search use [OpenRouteService](https://openrouteservice.org) (ORS).

1. Sign up at https://openrouteservice.org/dev/#/signup
2. In the dashboard, create a token ("Request a token", Standard plan, free).
3. Copy the key into `.env.local`:
   ```
   ORS_API_KEY=your-key-here
   ```
4. Restart `npm run dev`.

The key is only read by the server code in `/api`. It is never sent to the browser. Never commit
`.env.local` (it's already in `.gitignore`). The free plan allows about 2,000 routes and 1,000
address searches per day.

Without a key, everything works except Get Me Out and address search, which show a message
saying the key is missing.

## Deploy to Vercel (step by step)

### Option A: from the website (easiest)

1. Push this project to GitHub.
2. Go to https://vercel.com, sign in with GitHub, click **Add New... > Project**, and import
   the repository.
3. Vercel detects Vite. Leave the build settings as they are.
4. Open **Environment Variables** and add `ORS_API_KEY` with your key. Tick Production,
   Preview and Development.
5. Click **Deploy**. In a minute you get a link like `https://turnaround-xyz.vercel.app`.

If you add or change the key after the first deploy, redeploy (Deployments > ... > Redeploy).

### Option B: from the terminal

```bash
npm install -g vercel
vercel login
vercel link                                   # create or pick the Vercel project
vercel env add ORS_API_KEY production         # paste the key when asked
vercel env add ORS_API_KEY preview
vercel env add ORS_API_KEY development
vercel --prod                                 # build and publish
```

### After deploying

- Open the site on your phone and use **Add to Home Screen** to install it.
- Add `?test=1` to the address (for example `https://your-site.vercel.app/?test=1`) to show
  the Test mode panel on the live site, for demos on dry days.

## Project layout

```
/api            Vercel server functions: route.ts, geocode.ts, gauges.ts
/cover          cover.svg and turnaround-cover.png
/docs           HOW-IT-WORKS.md, DECISIONS.md, DEMO-SCRIPT.md
/scripts        make-cover.ts, make-icons.ts, fetch-harvey.ts, check-gauges.ts, fonts/
/src
  /components   Map, Legend, StatusBanner, GaugeCard, RoutePanel, RainOutlook, ...
  /data         gauges.ts, brays-bayou.ts, harvey-2017.json
  /lib          risk.ts, colors.ts, nwps.ts, weather.ts, routing.ts, geo.ts, ... (+ tests)
  App.tsx, main.tsx
```

Start with [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).

## Data and credits

- Water levels and flood stages: NOAA National Water Prediction Service
- Hurricane Harvey water levels: USGS Water Services
- Rain forecast: National Weather Service (api.weather.gov)
- Routing and place search: OpenRouteService
- House-number address search: US Census Bureau Geocoder
- Ground heights for the destinations: USGS Elevation Point Query Service
- Map tiles and the bayou outline: © OpenStreetMap contributors (ODbL)
- Inter font (used only to draw the cover and icons): SIL Open Font License, see `scripts/fonts/OFL.txt`
