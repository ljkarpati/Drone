// Other water near Meyerland that TurnAround needs to know about.
// Map data (c) OpenStreetMap contributors, available under the Open Database License (ODbL).
// Downloaded 2026-10-15 through the Overpass API.

// Willow Waterhole Bayou: runs west to east about 2.5 km south of Brays Bayou, then turns
// north-east and joins Brays near I-610. So the south side of Meyerland has bayous on three
// sides. It has NO official gauge, so the app can't tell when it floods; it only warns you
// when a route crosses it. OSM ways 103694056, 1090387558, 1090387557, 1090387556, 802626977
// and 802626978, simplified from 135 to 38 points (within 8 m).
export const WILLOW_WATERHOLE: [number, number][] = [
  [-95.50557, 29.65449],
  [-95.49794, 29.65446],
  [-95.49748, 29.65427],
  [-95.49321, 29.65091],
  [-95.49203, 29.65024],
  [-95.49104, 29.64985],
  [-95.48988, 29.64950],
  [-95.48939, 29.64948],
  [-95.48395, 29.65091],
  [-95.48335, 29.65148],
  [-95.48293, 29.65228],
  [-95.48228, 29.65269],
  [-95.48159, 29.65278],
  [-95.47979, 29.65258],
  [-95.47853, 29.65296],
  [-95.47762, 29.65288],
  [-95.47066, 29.65725],
  [-95.47028, 29.65731],
  [-95.46878, 29.65687],
  [-95.46826, 29.65801],
  [-95.46734, 29.65905],
  [-95.46707, 29.65918],
  [-95.46609, 29.65926],
  [-95.46527, 29.65966],
  [-95.46419, 29.66038],
  [-95.46291, 29.66157],
  [-95.46271, 29.66232],
  [-95.46156, 29.66346],
  [-95.46061, 29.66396],
  [-95.45874, 29.66597],
  [-95.45802, 29.66746],
  [-95.45403, 29.67204],
  [-95.45370, 29.67315],
  [-95.45419, 29.67570],
  [-95.45414, 29.67717],
  [-95.45393, 29.67798],
  [-95.45262, 29.68111],
  [-95.45216, 29.68343],
];

// Major road bridges over Brays Bayou (OpenStreetMap bridges within 40 m of the bayou).
// Used to say WHERE a route crosses the bayou, e.g. "crosses Brays Bayou at Fondren Rd".
export const BRAYS_BRIDGES: { name: string; lon: number; lat: number }[] = [
  { name: "Beechnut St", lon: -95.55231, lat: 29.68996 },
  { name: "US 59 (Southwest Fwy)", lon: -95.53674, lat: 29.6809 },
  { name: "Bissonnet St", lon: -95.53053, lat: 29.67646 },
  { name: "S Gessner Dr", lon: -95.52824, lat: 29.67279 },
  { name: "Fondren Rd", lon: -95.50875, lat: 29.6763 },
  { name: "Hillcroft Ave", lon: -95.49321, lat: 29.67839 },
  { name: "Chimney Rock Rd", lon: -95.47674, lat: 29.67745 },
  { name: "S Rice Ave", lon: -95.46759, lat: 29.67876 },
  { name: "I-610 West Loop", lon: -95.4582, lat: 29.68157 },
  { name: "Stella Link Rd", lon: -95.43998, lat: 29.69063 },
  { name: "Buffalo Speedway", lon: -95.42696, lat: 29.69585 },
  { name: "Kirby Dr", lon: -95.4181, lat: 29.69737 },
  { name: "Main St", lon: -95.41216, lat: 29.69737 },
  { name: "Greenbriar Dr", lon: -95.4078, lat: 29.70037 },
  { name: "Fannin St", lon: -95.40237, lat: 29.70237 },
  { name: "Bertner Ave", lon: -95.39937, lat: 29.70287 },
  { name: "Holcombe Blvd", lon: -95.3929, lat: 29.70608 },
];
