# How TurnAround works

Read this before you talk to judges. It walks through every part of the app in plain English,
in the order the data flows.

## 1. The big picture

```
 Gauge in the bayou ──► NOAA website ──► /api/gauges ──► the app on your phone
 (measures water                         (our server:      │
  height every 15 min)                    trims + caches)   ▼
                                                     classifyRisk()  →  safe / at risk / flooding / major
                                                            │
                                                            ▼
                                                     riskZones()     →  danger strips along the bayou
                                                            │
                     You tap "Get Me Out" ──────────────────┤
                                                            ▼
                                       buildAvoidAreas() → /api/route → OpenRouteService
                                                            │
                                                            ▼
                                       route drawn on the map, double-checked, links to Google/Apple Maps
```

Everything important happens in four small files:

| File | Job |
| --- | --- |
| `src/data/gauges.ts` | The two gauges and their official flood stages |
| `src/lib/risk.ts` | Turns a water level into a risk level, and risk into danger zones |
| `src/lib/routing.ts` | Turns danger zones into "areas to avoid" and asks for a route |
| `src/lib/colors.ts` | The colors and words for each risk level |

## 2. Where the data comes from

**River gauges (NOAA).** A gauge is a sensor on a bridge that measures how high the water is,
in feet, every 15 minutes. The number is "stage": the water height on the gauge's own ruler, not
the depth of water in your street. Two official gauges watch this part of Brays Bayou:

| Gauge | Where | Normal | Action | Flood | Major |
| --- | --- | --- | --- | --- | --- |
| GSST2 | Brays Bayou at Gessner Dr (upstream, west) | 38.7 ft | 54 ft | 57 ft | 59 ft |
| HBMT2 | Brays Bayou at S Main St (downstream, east) | 16.8 ft | 38 ft | 41 ft | 43 ft |

The flood stages come from NOAA's National Water Prediction Service
(`https://api.water.noaa.gov/nwps/v1/gauges/HBMT2`). The "normal" number is the middle value of
30 days of readings in dry weather. Notice the two gauges have completely different numbers:
38 ft is dangerous at S Main St and perfectly normal at Gessner. That's why every gauge carries
its own stages.

`npm run check-gauges` downloads NOAA's numbers again and tells you if anything changed.

**Our small server (`/api/gauges`).** NOAA sends 30 days of readings every time (about 450 KB per
gauge). On a phone in a storm that's slow. Our server function keeps only the last 48 hours and
lets Vercel's CDN reuse the answer for 5 minutes. If our server is down, the app asks NOAA
directly.

**Rain (National Weather Service).** The app asks api.weather.gov which forecast grid square
covers Meyerland, then adds up the expected rain for the next 24 hours and 3 days.

**Routes (OpenRouteService).** ORS is a free routing service built on OpenStreetMap. It can take
a list of polygons to avoid. That feature is the whole reason we use it.

## 3. How `classifyRisk` decides a level

```ts
classifyRisk(stageFt, stages, readingAgeMin)
```

It compares the newest reading with the gauge's official stages, from the top down:

1. No reading, or a reading older than 3 hours? **unknown**
2. At or above **major** flood stage? **major**
3. At or above **flood** stage? **flooding**
4. At or above **action** stage? **atRisk**
5. Otherwise: **safe**

"At or above" matters. Exactly 41.0 ft at S Main St counts as flooding, the same way NWS counts
it. The tests in `src/lib/risk.test.ts` check every boundary: just below action, exactly at action,
exactly at flood, exactly at major, no reading, and a stale reading.

**Why 3 hours for "stale"?** Gauges report every 15 minutes, but readings usually reach NOAA's
website 30 to 75 minutes late. If nothing new has come in for 3 hours, several reports in a row
are missing, so we stop calling the reading "current".

**"Last known" readings.** Gauges often break in the middle of a flood. During Harvey, the
Gessner gauge went silent for 24 hours right at the peak. If a silent gauge's last reading was
dangerous, the app keeps treating it as dangerous and labels it "last known"
(`effectiveRisk()` in `risk.ts`). A silent gauge should never make a flooded street look safe.

**The banner** shows the worst level across both gauges (`overallStatus()`). "Unknown" counts as
worse than safe (we can't promise it's fine) but better than a real warning.

## 4. From a gauge to a danger zone

This is the most important idea in the app.

A gauge is a single point, but neither of our gauges is inside Meyerland. From the middle of
the neighborhood, Gessner is about 5 km upstream and S Main St is about 6 km downstream. If we drew one circle around each gauge,
the danger zones would sit on top of Gessner and the Medical Center, and **Meyerland would look
safe even while it flooded.**

So each gauge "speaks for" a stretch of the bayou, called its **reach**:

- Gessner speaks for the bayou from just west of Gessner to between Chimney Rock and S Rice.
- S Main St speaks for the bayou from there through I-610 and Stella Link to Main St.

When a gauge isn't safe, `riskZones()` walks along its stretch of the bayou (we have the bayou's
center line from OpenStreetMap in `src/data/brays-bayou.ts`) and stamps a circle every few
hundred meters, like a rubber stamp. The circles overlap, so together they make one continuous
danger strip that follows the water. Each circle is a 32-sided polygon, because that's the shape
routing services understand.

How wide the strip is depends on the level:

| Level | Circle radius | Why |
| --- | --- | --- |
| At risk | 150 m | The channel plus N and S Braeswood Blvd, which flood first |
| Flooding | 350 m | Water out of the banks reaches the first blocks of houses |
| Major | 600 m | In Harvey and the 2016 Tax Day flood, water spread deep into Meyerland |

These widths are **our estimates**, not official numbers. NOAA doesn't publish them. A test checks
that every point of the bayou in a gauge's reach is covered with no gaps.

## 5. From danger zones to a route

When you tap **Get Me Out**, you pick a start (your location, an address, or the demo start)
and a destination.

**Which way is "out"?** The app works out which side of Brays Bayou you're on (`braysSide()` in
`src/lib/sides.ts`: it finds the closest piece of the bayou and checks whether you're to its left
or right as the water flows east). Then it recommends destinations on **your** side, highest
ground first, because the bridges are the first places to flood. Ground heights come from the
USGS elevation service: Meyerland is about 53–57 ft, and the recommended spots are 60–65 ft.
Destinations across the bayou are still listed, under "only if you must".

Addresses with a house number are looked up with the US Census Bureau geocoder, which knows every
street's house numbers. Place names go to OpenRouteService.

`buildAvoidAreas()` in `routing.ts` turns the zones into the list of areas the route must avoid.
Normally that's simply every circle. The tricky case is when **you start inside a danger zone**,
which is likely: the people who need this app live near the bayou.

- If we kept the circle you're standing in, there'd be no way out.
- If we just removed it, we'd open a gap in the strip, and the route might send you across the
  nearest bayou bridge, straight toward the water.

So the app does both halves of the right thing: it opens up the big circles around you (and
anything within 150 m of you), **but keeps a narrow strip over the bayou channel itself blocked**.
The route leads you away from the water, not across it, and the app warns you that you're starting
in a risk area.

Then:

1. The browser sends the start, the end and the avoid areas to our server function `/api/route`.
2. The server adds the secret ORS key and asks ORS for a driving route with
   `options.avoid_polygons` set to those areas (a GeoJSON MultiPolygon).
3. If ORS finds no route, the app says: *"No route avoids all flooded areas. Stay where you are
   and call 911 if you are in danger."*
4. If it finds one, **the app double-checks it**: it walks along the route every 20 m and makes
   sure no point is inside an avoid area. If one were, a red warning would appear.
5. The route is drawn in bold navy with a white edge, with drive time, distance, how many danger
   areas it avoids, the main roads, and **where it crosses a bayou** (for example "crosses Brays
   Bayou at Fondren Rd", or a warning if it crosses Willow Waterhole Bayou, which has no gauge).
6. "Open in Google Maps" passes 3 points along our route, so Google follows it. Apple Maps links
   can only take a start and an end, so the app warns that Apple may choose different roads.

**Why the key lives on the server:** anything in the browser can be copied. If the key were in
the browser, anyone could use up our free quota. The server also refuses trips outside Houston.

**How we tested it.** There was no ORS key while building, so we tested with GraphHopper, the
open-source routing engine ORS is built on, running on a real Houston road map. We sent it the
app's actual danger zones in 56 combinations (4 flood scenarios, 7 starting points from 60 m to
700 m from the bayou, 2 destinations). No route entered a danger zone or crossed the bayou inside a
danger stretch. A starting point south of the bayou drives roughly 8 to 13 km extra to cross somewhere safe,
which is exactly what a driver who knew where the water was would do.

## 6. The Harvey Replay

`src/data/harvey-2017.json` holds the real water levels from both gauges, every 15 minutes, from
August 25 to September 2, 2017, downloaded once from USGS (`npm run fetch-harvey`). It's saved in
the app, so the replay never needs the internet.

The replay doesn't have any special Harvey logic. At each moment on the slider it calls the
**exact same functions** as the live app (`gaugeStatusesAt`, `classifyRisk`, `riskZones`,
`bannerSentence`) with the readings that existed at that moment. So what you see is what the live
app would have shown.

What it shows (all from the real data, all checked by tests in `harvey.test.ts`):

| Time (Houston) | What happened |
| --- | --- |
| Sat Aug 26, 9:00 PM | Gessner reaches action stage. **First alert.** |
| 9:30 PM | Gessner reaches flood stage |
| 10:00 PM | S Main St reaches action stage |
| 11:30 PM | Gessner reaches major flood stage, then goes silent for 24 hours |
| Sun Aug 27, 12:30 AM | S Main St reaches flood stage |
| 4:45 AM | S Main St reaches major flood stage (it crests at 45.67 ft around 12:30 PM) |

**How much warning?** We measure it two ways:

- From a gauge's own action stage to its flood stage: **30 minutes** at Gessner, **2.5 hours**
  at S Main St.
- From the app's *first* alert anywhere on the bayou to flooding: **3.5 hours** at S Main St,
  because the upstream Gessner gauge raised the alarm first.

**The honest lesson:** Brays Bayou rises fast. At S Main St it climbed more than 12 feet in one
hour. A gauge alone can't give hours of notice. That's why the app shows the rain forecast too,
and why it plans the way out instead of leaving you to find it by trial and error in the dark.

You can tap **Get Me Out** at any moment in the replay to see the route the app would have
suggested. (It uses today's roads.)

## 7. Offline and errors

- Each time readings download, they're saved on the phone (localStorage). With no signal, the app
  shows them with a note: "Offline. Showing last known readings from 3:45 PM."
- The app installs to the home screen (it's a PWA). A service worker saves the app itself and the
  map tiles you've already seen, so it opens with no signal.
- If NOAA is down and nothing is saved, the banner says so and points to weather.gov.

## 8. Limits (say these out loud; judges respect it)

- **Streets can flood from storm drains before the bayou rises.** The app only knows what the
  bayou gauges know.
- Only two official gauges cover this stretch, and neither is in Meyerland. Between them, the
  danger zones are estimates.
- Zone widths are our estimates, not an official flood map.
- Gauge readings reach the app 30 to 75 minutes after they're measured.
- Keegans Bayou and Willow Waterhole Bayou have no official gauges here, so they aren't shown.
- Google and Apple Maps don't know about the flooding.
- It is not an official warning service. Follow the National Weather Service. Call 911.

## 9. Ten questions judges are likely to ask

**1. How do you know when it's dangerous? Did you make up the thresholds?**
No. Every threshold is the National Weather Service's official flood stage for that gauge,
downloaded from NOAA. A script (`npm run check-gauges`) re-checks them against NOAA.

**2. Your gauges aren't in Meyerland. How can you say Meyerland is flooding?**
Good catch. That's the main design problem we solved. Each gauge speaks for a stretch of the
bayou, and we draw the danger along that stretch, not just around the gauge. It's still an
estimate between gauges, and we say so in the app.

**3. What happens if a gauge breaks during the flood?**
If its last reading was dangerous, we keep showing that danger and label it "last known". That
actually happened at Gessner during Harvey, and the replay shows it.

**4. How does the route avoid the water?**
We turn each danger zone into polygons and send them to OpenRouteService as "avoid polygons".
ORS will only return a route that doesn't touch them. Then we double-check the route ourselves
every 20 meters.

**5. What if I'm already inside a danger zone?**
We open up the area around you so you can get out, but we keep the bayou channel itself blocked,
so the route leads you away from the water instead of across a bridge. The app also warns you.

**6. What if there's no safe route?**
It tells you plainly: no route avoids all flooded areas; stay where you are and call 911 if
you're in danger. The National Weather Service says more than half of flood drownings happen
when someone drives into floodwater. That's where the name comes from: "Turn Around, Don't Drown."

**7. Does it work with no internet?**
Partly. It installs like an app, opens with no signal, and shows the last readings it saved.
Routing needs a connection.

**8. How do you know it would have worked in Harvey?**
The replay runs the real Harvey readings through the exact same code as the live app. It would
have raised its first alert at 9:00 PM on August 26, 3.5 hours before S Main St flooded. It also
shows honestly that at Gessner the warning was only 30 minutes.

**9. Why should anyone trust this over the official warnings?**
They shouldn't. It's not a replacement. It uses the official data and adds the one thing those
tools don't do: plan a way out. The app says to follow the National Weather Service.

**10. What would you add next?**
Harris County's Flood Warning System has many more gauges, including ones much closer to
Meyerland, which would make the danger zones much more precise. We'd also add FEMA flood maps to set the zone
widths, and push notifications when a gauge reaches action stage.
