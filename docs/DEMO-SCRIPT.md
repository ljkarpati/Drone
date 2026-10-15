# Demo script (about 2 minutes)

Say it in your own words, and change anything that isn't true for you (for example, whether
your own family flooded). Every number in this script comes from real data and is checked by the
app's tests.

## Before you start

- [ ] Run `npm run check-gauges` the day before. Fix anything it reports.
- [ ] Open `https://YOUR-SITE.vercel.app/?test=1` on your phone and do one test route.
- [ ] Brightness up. Have a phone hotspot ready in case the venue Wi-Fi is bad (Get Me Out needs
      a connection).

## The script

**[0:00] Open with Harvey.**

> "In August 2017, Hurricane Harvey flooded my neighborhood, Meyerland. Brays Bayou, which runs
> right through it, rose more than twelve feet in one hour. People drove into water they couldn't
> see, at night. The tools we had showed how high the bayou was. None of them told you how to get
> out. So I built TurnAround."

**[0:20] Live status.**

> "This reads the two official Brays Bayou gauges every five minutes and compares them with the
> National Weather Service's flood stages. Right now it's all clear: green, with a check mark,
> because color is never the only signal."

Scroll past the map to the gauge widgets.

> "Each ring shows how close that gauge is to flood stage, and whether the water is rising."

**[0:45] Make it flood.** Scroll to Test mode at the bottom.

> "It's dry today, so I'll use test mode to pretend both gauges are at flood stage."

Set both gauges to **Flooding**. Scroll back up.

> "The banner changed, and the map shows a danger strip along the bayou. Neither gauge is actually
> in Meyerland, so instead of a circle around each gauge, the app marks the stretch of bayou each
> one is responsible for."

**[1:05] Get Me Out.** Tap **Get Me Out**, type a south-side address (or **Use demo start**).

> "I live south of the bayou. The app knows that, so it doesn't send me across a bridge. Those
> are the first places to flood. It recommends higher ground on my side. This one is 65 feet up;
> Meyerland is about 55."

Tap the **Best** destination, then **Find a safe route**.

> "The route avoids every danger zone, and the app double-checks it every 20 meters. If there were
> no safe way out, it would say so and tell me to stay put and call 911."

**[1:35] Proof and honesty.**

> "I tested it on the real Harvey data. It would have raised its first alert at 9 PM on August 26th,
> three and a half hours before the bayou flooded at Main Street. But at Gessner, the warning was
> only thirty minutes. Bayous rise fast, so the most important feature is the way out. And when the
> Gessner gauge broke at the peak of the storm, the app kept the last dangerous reading instead of
> treating the silence as safe."

**[1:55] Close.**

> "TurnAround isn't an official warning service, and it says so. But it answers the question you
> actually have at 2 AM in the rain: is the water near me dangerous, and how do I get out? Turn
> around, don't drown."

## If something goes wrong

- **Get Me Out shows an error**: the network is down or the ORS key isn't set. Say "routing needs
  a connection" and show the map and banner instead.
- **The live gauges won't load**: the app shows the last saved readings with a note. That's a
  feature: point it out.
- **A judge asks something you don't know**: "I don't know, but here's how I'd find out" beats
  guessing. The likely questions and answers are at the end of `docs/HOW-IT-WORKS.md`.
