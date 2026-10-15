# Demo script (2 to 3 minutes)

Say it in your own words, and change anything that isn't true for you (for example, whether
your own family flooded). Every number in this script comes from the app's real data.

## Before you start

- [ ] Run `npm run check-gauges` the day before. Fix anything it reports.
- [ ] Make sure `ORS_API_KEY` is set on Vercel, and do one test route on the live site.
- [ ] Open two tabs: `https://YOUR-SITE.vercel.app/?test=1` and `https://YOUR-SITE.vercel.app/harvey`.
- [ ] In the Harvey tab, set speed to **6 hours / sec** and leave **Pause at each warning** on.
- [ ] Phone or browser at phone width. Brightness up.
- [ ] If the venue Wi-Fi is bad: the Harvey Replay works offline once loaded, but Get Me Out needs a
      connection. Have a phone hotspot ready.

## The script

**[0:00] Open with Harvey. Harvey tab, don't touch anything yet.**

> "In August 2017, Hurricane Harvey flooded my neighborhood, Meyerland. Brays Bayou, which runs
> right through it, rose more than twelve feet in one hour. People drove into water they couldn't
> see, at night. The tools we had showed how high the bayou was. None of them told you how to get
> out. So I built TurnAround."

**[0:25] Live status. Switch to the live tab.**

> "This is the live app. It reads the two official Brays Bayou gauges every five minutes and
> compares them with the National Weather Service's flood stages. Right now it's all clear: green,
> with a check mark, because color is never the only signal."

Scroll briefly past the map and gauge cards.

> "Each card shows the water level, how close it is to flood stage, and whether it's rising."

**[0:50] Get Me Out. Scroll down to Test mode.**

> "It's dry today, so I'll use test mode to pretend both gauges are at flood stage."

Set both gauges to **Flooding**. Scroll back up.

> "The banner changed, and the map now shows a danger strip along the bayou. One key idea: neither
> gauge is in Meyerland, so instead of a circle around each gauge, the app marks the stretch of
> bayou each one is responsible for."

Tap **Get Me Out** → **Use demo start** → **North of I-610 via Stella Link** → **Find a safe route**.

> "I'm starting on Rutherglenn, south of the bayou. Normally I'd cross the bayou right here. The
> app sends the flooded areas to the routing service as places to avoid, and this route goes
> around them to cross where it's safe. Then the app double-checks the route itself, every 20
> meters. I can open it in Google Maps, and Google follows the same path."

**[1:40] Harvey Replay. Switch to the Harvey tab.**

> "Does it actually work? This is the real Harvey data from both gauges, played through the exact
> same code the live app runs."

Tap **Jump to Aug 26, 6 PM**, then **Play**. It pauses at each warning.

- At **9:00 PM**: "First alert. The Gessner gauge upstream hits action stage."
- At **9:30 PM**: "Thirty minutes later, it's flooding. That's how fast this bayou is."
- Keep pressing Play. It stops at 10:00 PM (S Main St at risk) and 11:30 PM (Gessner major); just
  name them. At **12:30 AM**: "S Main St floods. The app had warned 3 hours and 30 minutes
  earlier, because the upstream gauge raised the alarm first."

Scroll to **How much warning would TurnAround have given?**

> "I want to be honest about this: at Gessner the warning was only thirty minutes. A gauge alone
> can't give hours of notice. That's why the app also shows the rain forecast, and why the most
> important feature is the way out."

**[2:30] Close.**

> "Also: the Gessner gauge broke at the peak of the storm. The app doesn't treat that silence as
> safe; it keeps the last dangerous reading on the map. TurnAround isn't an official warning
> service, and it says so. But it answers the question you actually have at 2 AM in the rain: is
> the water near me dangerous, and how do I get out? Turn around, don't drown."

## If something goes wrong

- **Get Me Out shows an error**: the ORS key isn't set or the network is down. Say "routing needs a
  connection" and move straight to the Harvey Replay, which works offline.
- **The live gauges won't load**: the app shows the last saved readings with a note. That's a
  feature: point it out.
- **A judge asks something you don't know**: "I don't know, but here's how I'd find out" beats
  guessing. The likely questions and answers are at the end of `docs/HOW-IT-WORKS.md`.
