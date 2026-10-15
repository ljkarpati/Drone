# Decisions

Every judgment call made while building TurnAround, and why. "Spec" means the original project
brief. Where we went against the spec, it says so.

## Data

**1. Only two gauges: Gessner (GSST2) and S Main St (HBMT2).**
On 2026-10-15 we searched NWPS for every gauge between 29.50–29.80 N and 95.75–95.25 W. Only these
two are on Brays Bayou. Keegans Bayou has a USGS water-level sensor at Roark Rd (08074800) but no
official NWS flood stages, and Willow Waterhole Bayou has no real-time gauge in the area. We only
use gauges with official flood stages, so the app never invents its own definition of "flooding".

**2. Flood stages come from the API, with the URL and date in comments.**
Both gauges' NWPS numbers matched the spec's fallback values for HBMT2 (38/41/43). We also store
NWS's moderate stage. `npm run check-gauges` re-checks them.

**3. The spec's name for HBMT2 is kept.** NWPS calls it "Brays Bayou at Houston". It sits at the
Main Street bridge, so "Brays Bayou at S Main St" is clearer for residents.

**4. Added fields to the `Gauge` type** (spec deviation): `stages.normal` (needed for
`percentToFlood`, which the spec asks for "from the normal-water baseline"), `shortName` (for
sentences), `reach` (see #8) and `avoid` (streets named in the banner).

**5. "Normal" = the median of 30 days of dry-weather readings** (16.8 ft at S Main, 38.7 ft at
Gessner), pulled 2026-10-15. NOAA doesn't publish a normal level for these gauges.

**6. Harvey data is saved exactly as USGS published it** (approved data, 15-minute readings). We
did not fill in gaps. The Gessner gauge's 24-hour silence at the peak is real, and a test checks
how the app handles it.

**7. Bayou geometry from OpenStreetMap.** The center line of Brays Bayou (5 OSM ways, simplified
from 292 to 106 points, each within 8 m of the original) is stored in `src/data/brays-bayou.ts`
with ODbL attribution.

## Risk logic

**8. Danger zones follow the bayou, not a circle around each gauge** (the biggest spec
deviation). The spec says one circle per gauge. Neither gauge is in Meyerland (about 5 km and 6 km
away), so a circle around each would mark Gessner and the Medical Center while Meyerland, between
them, looked safe. Instead each gauge has a `reach` (a stretch of bayou), and `riskZones()` stamps
32-point circles along it, spaced one radius apart so they overlap with no gaps. Each zone is
still "a circle approximated as a 32-point polygon, with radius from zoneRadiusM", as the spec
asks; there are just many of them.

**9. The reach boundary is between Chimney Rock and S Rice Ave** (longitude -95.472). That's
roughly where the two gauges are equally far away. It's an estimate.

**10. Zone radii: 150 m (at risk), 350 m (flooding), 600 m (major).** Our estimates, not official.
150 m covers the channel plus N and S Braeswood Blvd. 600 m reflects how far water spread into
Meyerland in 2016 and 2017. These should be checked against FEMA flood maps (see Open questions).

**11. Moderate flood stage is folded into "flooding".** The spec has five levels; NWS has six. We
keep NWS's moderate number in the data but show it as "flooding".

**12. Exactly at a stage counts as that stage** (41.0 ft at S Main St = flooding). That's how NWS
defines it.

**13. Stale after 3 hours.** Readings reach NOAA 30–75 minutes late, so a 1-hour limit would mark
gauges unknown during normal delays. Three hours means several reports in a row are missing.
`classifyRisk` takes an optional third argument (the reading's age) so the spec's two-argument
form still works.

**14. "Last known" danger** (`effectiveRisk()`). If a gauge goes silent while dangerous, we keep
its danger level and label it "last known". If it goes silent while safe, it's "unknown". We look
back at most 48 hours. Reason: the Gessner gauge went silent for 24 hours at Harvey's peak; a
silent gauge must never make a flooded area look safe.

**15. "Unknown" ranks above "safe" in the banner**, but below any real warning. If one gauge is
silent and the other is normal, the banner says exactly that.

**16. Trend uses the reading 40–80 minutes before the latest one.** A change of more than 0.1 ft
counts as rising or falling. If there's no reading in that window, the trend is "unknown" rather
than a guess.

## Routing

**17. Starting inside a danger zone** (not in the spec, but the most likely real situation).
`buildAvoidAreas()` opens up the zone circles within 150 m of the start or end, so the route can
get you out, but keeps a 40 m-wide strip over the bayou channel blocked in those places, so the
route can't send you across the nearest bridge. We first tried simply dropping those circles.
Testing on a real road network showed that opened a gap a route could use to cross the bayou
toward the water. A 60 m strip trapped drivers on S Braeswood, so we narrowed it to 40 m, which
still covers the channel (about 60–75 m wide bank to bank).

**18. The app double-checks every route** by walking it every 20 m against the avoid areas. If a
route ever touched one, a red warning would show.

**19. Our server refuses trips outside greater Houston and caps the number of polygons**, so the
ORS key can't be used as a free routing service by others.

**20. Address search uses two services.** In real use, typing a house number into ORS often
returned only the street (four identical "Bankside Drive" results with no number). Now, anything
starting with a house number goes first to the free US Census Bureau geocoder, which knows the
house-number ranges of every US street. ORS still handles place names. Duplicates are removed,
and street-only answers are labeled "Street only". The search is limited to greater Houston,
focused on Meyerland, and runs on Enter, not on every keystroke, to stay within the free quota.

**21. Destinations depend on which side of the bayou you start on** (added after testing; the
spec's presets made people south of the bayou drive across it). The app works out your side of
Brays Bayou from the bayou's center line, recommends destinations on your side first (highest
ground first, marked "Best"), and lists the others under "Across Brays Bayou: only if you must".
Every result also says where the route crosses Brays Bayou, and warns if it crosses Willow
Waterhole Bayou, which has no gauge. On real roads, a start on Bankside Dr during a flood went
from a 17.8 km loop across the bayou to 3.4 km with no crossing.

**21b. Destinations were chosen with real ground heights** from the USGS Elevation Point Query
Service. Meyerland sits at about 53–57 ft, and the land rises to the west. North side: Hillcroft
Ave at Westpark Dr (63 ft) and the spec's Stella Link Rd at Holcombe Blvd (49 ft; it's away from
the bayou but lower than Meyerland, so it's listed second). South side: S Gessner Dr at W Bellfort
Ave (65 ft, reachable from south Meyerland without crossing any bayou) and Hillcroft Ave at W
Airport Blvd (60 ft, across Willow Waterhole). The app shows each one's height.

**22. Google Maps gets 3 stops along our route** (the most phone browsers accept in a link), so it
follows our path. Apple Maps links can't take stops, so the app warns that Apple may choose other
roads.

**23. The demo start is Rutherglenn Dr at Manhattan Dr**, a Meyerland street about 500 m south of
the bayou. A start north of the bayou never has to cross it, so it wouldn't show what the routing
does.

**24. How routing was tested without an ORS key.** No key was available while building. We ran
GraphHopper (the open-source engine ORS is built on) locally on a Houston road map and sent it
the app's real avoid areas: 56 cases (4 flood scenarios, 7 starts from 60 m to 700 m from the
bayou, 2 destinations). No route entered an avoid area or crossed the bayou in a danger stretch.
`api/route.test.ts` checks the exact request we send to ORS. **The live ORS connection itself still
needs one check with a real key** (see the demo script's setup).

## App and design

**25. Map center moved** (spec deviation). The spec's point (29.688, -95.456) is the northeast
corner of Meyerland, near Meyerland Plaza and I-610. On a phone at zoom 14 it showed mostly
Braeswood Place and missed the west half of Meyerland. We center on the middle of Meyerland's
boundary in OpenStreetMap (29.6788, -95.4761), still at zoom 14. The weather and address search
still use the spec's point; the difference doesn't matter for them.

**26. `/api/gauges` proxy added although NOAA allows browser requests.** NOAA sends 30 days of
readings (about 450 KB per gauge) on every request. The proxy trims to 48 hours and caches for 5
minutes at Vercel's edge. If it fails, the app calls NOAA directly.

**27. Local `/api` without the Vercel CLI.** A small plugin in `vite.config.ts` runs the `/api`
functions during `npm run dev`, so one command runs everything. The functions use the standard
`Request`/`Response` format that Vercel supports.

**28. No routing library.** Three pages don't need one. `src/router.tsx` is about 30 lines.

**29. Fonts.** The app uses the system font stack (San Francisco on iPhone, Roboto on Android),
with Inter first if it's installed. That means no download and no delay offline. The Inter font
files in `scripts/fonts` are only used to draw the cover and icons, so they look the same on
every computer.

**30. Colors follow the NWS map convention:** yellow for action, red for flooding, purple for major.
The yellow uses navy text, because white on yellow fails contrast. A unit test checks every color
pair passes WCAG AA (4.5 : 1). Every level also has an icon and a word.

**31. Zone drawing.** Overlapping see-through circles would look like a pile of darker rings. The
zones are drawn solid inside a single see-through map layer, so they blend into one smooth strip
with one outline.

**32. Dark mode darkens only the street tiles**, using a CSS filter. Zones, the bayou and the route
keep their true colors.

**33. Test mode is on in `npm run dev`, and on the live site with `?test=1`**, so the student can
demo flooding on a dry day. A striped banner says the readings are pretend.

**34. Offline.** The service worker saves the app and up to 400 map tiles you've already viewed. It
doesn't cache gauge data; the app keeps its own copy in localStorage, so it can say exactly how old
the readings are.

**35. The "heavy rain" note appears at 2 inches in 24 hours.** That's our own heads-up line, not an
NWS threshold. The note quotes a fact from the Harvey data: S Main St rose more than 12 ft in one
hour (a test checks this).

**35b. No Harvey Replay page** (spec deviation, the student's call after trying the app). The
page didn't help someone trying to get out, and it took space in the menu. The Harvey data stays
as automated tests (`src/lib/harvey.test.ts`), so "Tested on Hurricane Harvey" is still true and
checkable with `npm test`.

**36. Warning time is measured two ways** by the Harvey tests: from each gauge's own action stage to its
flood stage (30 minutes at Gessner, 2.5 hours at S Main), and from the first alert anywhere to each
gauge flooding (3.5 hours at S Main). Both are true, and the short one is shown honestly.

**36b. Apple-style design.** Widgets on a grouped gray background, a frosted header with a
segmented control, and the phone's own system font (San Francisco on iPhone), so nothing extra
downloads. No decorative animation: the only motion is a slight press effect on buttons. Every
gray text color was checked for at least 4.5 : 1 contrast in light and dark mode.

**37. Tooling versions.** Vitest 5 (the 3.x line has published security advisories in its
dependencies, and 4.x hit an npm install bug). Vite 7, React 19, react-leaflet 5, TypeScript 5.9.

## Open questions for the student

- **Are the south-side destinations right?** Decision 21 answers this with elevation data, but
  someone who lived through 2016 and 2017 in Meyerland should confirm those streets stayed dry.
- **Are the zone widths right?** Compare 150 / 350 / 600 m with FEMA flood maps or with what you
  saw in 2016 and 2017.
- **More gauges.** The Harris County Flood Warning System has gauges much closer to Meyerland.
  Adding them would make the zones far more precise.
