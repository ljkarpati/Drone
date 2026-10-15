// What TurnAround is, where its data comes from, and what it can't do.

import { GAUGES } from "../data/gauges";

export function About() {
  return (
    <article className="prose">
      <h1 className="page-title">About TurnAround</h1>
      <p className="lede">
        TurnAround answers one question for people in Meyerland during heavy rain:
        <strong> is the water near me dangerous right now, and how do I drive out without hitting it?</strong>
      </p>

      <h2>What it does</h2>
      <ul>
        <li>Reads the official river gauges on Brays Bayou every 5 minutes.</li>
        <li>Compares each reading with the National Weather Service's flood stages.</li>
        <li>Marks the stretch of bayou each gauge watches as a danger zone when it isn't safe.</li>
        <li>Plans a driving route that stays out of those zones.</li>
        <li>
          Was tested on the real Hurricane Harvey water levels: it would have raised its first
          alert at 9:00 PM on Aug 26, 2017, 3.5 hours before Brays Bayou flooded at S Main St.
        </li>
      </ul>

      <h2>Where the data comes from</h2>
      <ul>
        <li>
          Water levels and flood stages:{" "}
          <a href="https://water.noaa.gov/">NOAA National Water Prediction Service</a>, gauges{" "}
          {GAUGES.map((g, i) => (
            <span key={g.id}>
              {i > 0 && " and "}
              <a href={`https://water.noaa.gov/gauges/${g.id.toLowerCase()}`}>
                {g.name} ({g.id})
              </a>
            </span>
          ))}
          .
        </li>
        <li>
          Hurricane Harvey water levels:{" "}
          <a href="https://waterservices.usgs.gov/">USGS Water Services</a> (sites 08075000 and
          08074810, August 25 to September 2, 2017).
        </li>
        <li>
          Rain forecast: <a href="https://www.weather.gov/hgx/">National Weather Service Houston</a>{" "}
          through api.weather.gov.
        </li>
        <li>
          Routes and address search: <a href="https://openrouteservice.org/">OpenRouteService</a>.
        </li>
        <li>
          Map and bayou outline: <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>.
        </li>
      </ul>

      <h2>Limits</h2>
      <p className="callout">
        Streets can flood from storm drains before the bayou rises. This is not an official warning
        service. Follow the National Weather Service and call 911 in an emergency.
      </p>
      <ul>
        <li>
          Only two official gauges cover this part of Brays Bayou, at Gessner Dr and S Main St.
          Neither is inside Meyerland, so the danger zones between them are estimates.
        </li>
        <li>
          The size of each danger zone is our estimate, not an official flood map. Keegans Bayou
          and Willow Waterhole Bayou have no official gauges here, so they are not shown.
        </li>
        <li>Gauge readings reach the app 30 to 75 minutes after they are measured.</li>
        <li>
          Google Maps and Apple Maps don't know about the flooding. Compare their route with
          ours before you drive.
        </li>
        <li>Never drive into water. Turn around, don't drown.</li>
      </ul>

      <h2>Who made it</h2>
      <p>
        TurnAround was built for the Congressional App Challenge by a high school student who lives
        in Meyerland.
      </p>
    </article>
  );
}
