import type { LatLng, Place, RegionId } from './types';
import { haversineKm } from './scoring';

export const REGIONS: { id: RegionId; name: string }[] = [
  { id: 'inner-metro', name: 'Inner Metro' },
  { id: 'northern-metro', name: 'Northern Metro' },
  { id: 'southern-metro', name: 'Southern Metro' },
  { id: 'eastern-metro', name: 'Eastern Metro' },
  { id: 'western-metro', name: 'Western Metro' },
  { id: 'barwon-south-west', name: 'Barwon South West' },
  { id: 'grampians', name: 'Grampians' },
  { id: 'loddon-mallee', name: 'Loddon Mallee' },
  { id: 'hume', name: 'Hume' },
  { id: 'goulburn', name: 'Goulburn' },
  { id: 'gippsland', name: 'Gippsland' },
];

export const REGION_LABELS: Record<RegionId, string> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r.name]),
) as Record<RegionId, string>;

// A broad spread of Victorian places — major centres through to little-known
// towns, suburbs and regions — so games rarely repeat and there's always
// something new to learn. Coordinates are the town/locality centre.
const RAW_PLACES: Omit<Place, 'scaleKm'>[] = [
  // ───────────────────────────── CITIES ─────────────────────────────
  { id: 'melbourne', name: 'Melbourne', aliases: ['melb', 'melbs'], lat: -37.8136, lng: 144.9631, tier: 'city', region: 'inner-metro' },
  { id: 'geelong', name: 'Geelong', lat: -38.1475, lng: 144.3617, tier: 'city', region: 'barwon-south-west' },
  { id: 'ballarat', name: 'Ballarat', lat: -37.5622, lng: 143.8498, tier: 'city', region: 'grampians' },
  { id: 'bendigo', name: 'Bendigo', lat: -36.7578, lng: 144.2805, tier: 'city', region: 'loddon-mallee' },
  { id: 'mildura', name: 'Mildura', lat: -34.1848, lng: 142.1623, tier: 'city', region: 'loddon-mallee' },
  { id: 'shepparton', name: 'Shepparton', lat: -36.3801, lng: 145.3972, tier: 'city', region: 'goulburn' },
  { id: 'warrnambool', name: 'Warrnambool', lat: -38.3845, lng: 142.4805, tier: 'city', region: 'barwon-south-west' },
  { id: 'traralgon', name: 'Traralgon', lat: -38.1975, lng: 146.8206, tier: 'city', region: 'gippsland' },
  { id: 'wangaratta', name: 'Wangaratta', lat: -36.3895, lng: 146.3086, tier: 'city', region: 'hume' },
  { id: 'horsham', name: 'Horsham', lat: -36.7139, lng: 142.2004, tier: 'city', region: 'grampians' },
  { id: 'echuca', name: 'Echuca', lat: -36.1491, lng: 144.7487, tier: 'city', region: 'loddon-mallee' },
  { id: 'sale', name: 'Sale', lat: -38.1027, lng: 147.0683, tier: 'city', region: 'gippsland' },
  { id: 'wodonga', name: 'Wodonga', lat: -36.1214, lng: 146.8881, tier: 'city', region: 'hume' },
  { id: 'benalla', name: 'Benalla', lat: -36.551, lng: 145.9803, tier: 'city', region: 'hume' },
  { id: 'bairnsdale', name: 'Bairnsdale', lat: -37.8255, lng: 147.61, tier: 'city', region: 'gippsland' },
  { id: 'swan-hill', name: 'Swan Hill', lat: -35.338, lng: 143.5544, tier: 'city', region: 'loddon-mallee' },
  { id: 'hamilton', name: 'Hamilton', lat: -37.7447, lng: 142.0233, tier: 'city', region: 'barwon-south-west' },
  { id: 'portland', name: 'Portland', lat: -38.345, lng: 141.6041, tier: 'city', region: 'barwon-south-west' },
  { id: 'colac', name: 'Colac', lat: -38.3398, lng: 143.5853, tier: 'city', region: 'barwon-south-west' },
  { id: 'morwell', name: 'Morwell', lat: -38.2356, lng: 146.394, tier: 'city', region: 'gippsland' },
  { id: 'moe', name: 'Moe', lat: -38.1722, lng: 146.268, tier: 'city', region: 'gippsland' },
  { id: 'maryborough', name: 'Maryborough', lat: -37.0497, lng: 143.7384, tier: 'city', region: 'loddon-mallee' },
  { id: 'ararat', name: 'Ararat', lat: -37.284, lng: 142.9285, tier: 'city', region: 'grampians' },

  // ───────────────────────────── SUBURBS ─────────────────────────────
  { id: 'footscray', name: 'Footscray', lat: -37.7991, lng: 144.8991, tier: 'suburb', region: 'western-metro' },
  { id: 'frankston', name: 'Frankston', lat: -38.1408, lng: 145.3892, tier: 'suburb', region: 'southern-metro' },
  { id: 'dandenong', name: 'Dandenong', lat: -37.9877, lng: 145.2089, tier: 'suburb', region: 'southern-metro' },
  { id: 'williamstown', name: 'Williamstown', lat: -37.8566, lng: 144.8948, tier: 'suburb', region: 'western-metro' },
  { id: 'fitzroy', name: 'Fitzroy', lat: -37.7976, lng: 144.9793, tier: 'suburb', region: 'inner-metro' },
  { id: 'stkilda', name: 'St Kilda', lat: -37.8675, lng: 144.9763, tier: 'suburb', region: 'inner-metro' },
  { id: 'carlton', name: 'Carlton', lat: -37.8017, lng: 144.9718, tier: 'suburb', region: 'inner-metro' },
  { id: 'brunswick', name: 'Brunswick', lat: -37.7671, lng: 144.9565, tier: 'suburb', region: 'northern-metro' },
  { id: 'richmond', name: 'Richmond', lat: -37.8183, lng: 144.9974, tier: 'suburb', region: 'inner-metro' },
  { id: 'camberwell', name: 'Camberwell', lat: -37.832, lng: 145.0586, tier: 'suburb', region: 'eastern-metro' },
  { id: 'coburg', name: 'Coburg', lat: -37.7399, lng: 144.9621, tier: 'suburb', region: 'northern-metro' },
  { id: 'hawthorn', name: 'Hawthorn', lat: -37.8233, lng: 145.0386, tier: 'suburb', region: 'eastern-metro' },
  { id: 'collingwood', name: 'Collingwood', lat: -37.8, lng: 144.984, tier: 'suburb', region: 'inner-metro' },
  { id: 'northcote', name: 'Northcote', lat: -37.77, lng: 145.0, tier: 'suburb', region: 'northern-metro' },
  { id: 'preston', name: 'Preston', lat: -37.741, lng: 145.001, tier: 'suburb', region: 'northern-metro' },
  { id: 'prahran', name: 'Prahran', lat: -37.851, lng: 144.992, tier: 'suburb', region: 'inner-metro' },
  { id: 'south-yarra', name: 'South Yarra', lat: -37.838, lng: 144.992, tier: 'suburb', region: 'inner-metro' },
  { id: 'port-melbourne', name: 'Port Melbourne', lat: -37.84, lng: 144.94, tier: 'suburb', region: 'inner-metro' },
  { id: 'south-melbourne', name: 'South Melbourne', lat: -37.833, lng: 144.959, tier: 'suburb', region: 'inner-metro' },
  { id: 'elwood', name: 'Elwood', lat: -37.881, lng: 144.987, tier: 'suburb', region: 'inner-metro' },
  { id: 'caulfield', name: 'Caulfield', lat: -37.877, lng: 145.024, tier: 'suburb', region: 'southern-metro' },
  { id: 'malvern', name: 'Malvern', lat: -37.859, lng: 145.029, tier: 'suburb', region: 'inner-metro' },
  { id: 'kew', name: 'Kew', lat: -37.806, lng: 145.031, tier: 'suburb', region: 'eastern-metro' },
  { id: 'brighton', name: 'Brighton', lat: -37.908, lng: 144.997, tier: 'suburb', region: 'southern-metro' },
  { id: 'sandringham', name: 'Sandringham', lat: -37.951, lng: 145.009, tier: 'suburb', region: 'southern-metro' },
  { id: 'mentone', name: 'Mentone', lat: -37.983, lng: 145.066, tier: 'suburb', region: 'southern-metro' },
  { id: 'box-hill', name: 'Box Hill', lat: -37.819, lng: 145.124, tier: 'suburb', region: 'eastern-metro' },
  { id: 'doncaster', name: 'Doncaster', lat: -37.787, lng: 145.125, tier: 'suburb', region: 'eastern-metro' },
  { id: 'glen-waverley', name: 'Glen Waverley', lat: -37.878, lng: 145.164, tier: 'suburb', region: 'eastern-metro' },
  { id: 'ringwood', name: 'Ringwood', lat: -37.814, lng: 145.23, tier: 'suburb', region: 'eastern-metro' },
  { id: 'croydon', name: 'Croydon', lat: -37.795, lng: 145.281, tier: 'suburb', region: 'eastern-metro' },
  { id: 'oakleigh', name: 'Oakleigh', lat: -37.9, lng: 145.089, tier: 'suburb', region: 'eastern-metro' },
  { id: 'clayton', name: 'Clayton', lat: -37.924, lng: 145.12, tier: 'suburb', region: 'eastern-metro' },
  { id: 'springvale', name: 'Springvale', lat: -37.949, lng: 145.152, tier: 'suburb', region: 'southern-metro' },
  { id: 'berwick', name: 'Berwick', lat: -38.031, lng: 145.349, tier: 'suburb', region: 'southern-metro' },
  { id: 'pakenham', name: 'Pakenham', lat: -38.07, lng: 145.484, tier: 'suburb', region: 'southern-metro' },
  { id: 'cranbourne', name: 'Cranbourne', lat: -38.111, lng: 145.283, tier: 'suburb', region: 'southern-metro' },
  { id: 'werribee', name: 'Werribee', lat: -37.9, lng: 144.661, tier: 'suburb', region: 'western-metro' },
  { id: 'point-cook', name: 'Point Cook', lat: -37.915, lng: 144.75, tier: 'suburb', region: 'western-metro' },
  { id: 'sunshine', name: 'Sunshine', lat: -37.788, lng: 144.833, tier: 'suburb', region: 'western-metro' },
  { id: 'essendon', name: 'Essendon', lat: -37.751, lng: 144.908, tier: 'suburb', region: 'western-metro' },
  { id: 'moonee-ponds', name: 'Moonee Ponds', lat: -37.765, lng: 144.919, tier: 'suburb', region: 'western-metro' },
  { id: 'broadmeadows', name: 'Broadmeadows', lat: -37.681, lng: 144.919, tier: 'suburb', region: 'northern-metro' },
  { id: 'craigieburn', name: 'Craigieburn', lat: -37.6, lng: 144.942, tier: 'suburb', region: 'northern-metro' },
  { id: 'epping', name: 'Epping', lat: -37.65, lng: 145.021, tier: 'suburb', region: 'northern-metro' },
  { id: 'reservoir', name: 'Reservoir', lat: -37.717, lng: 145.007, tier: 'suburb', region: 'northern-metro' },
  { id: 'greensborough', name: 'Greensborough', lat: -37.704, lng: 145.103, tier: 'suburb', region: 'northern-metro' },
  { id: 'eltham', name: 'Eltham', lat: -37.715, lng: 145.148, tier: 'suburb', region: 'northern-metro' },
  { id: 'heidelberg', name: 'Heidelberg', lat: -37.756, lng: 145.07, tier: 'suburb', region: 'northern-metro' },
  { id: 'sunbury', name: 'Sunbury', lat: -37.579, lng: 144.727, tier: 'suburb', region: 'northern-metro' },
  { id: 'melton', name: 'Melton', lat: -37.683, lng: 144.583, tier: 'suburb', region: 'western-metro' },

  // ───────────────────────────── REGIONS ─────────────────────────────
  { id: 'gippsland', name: 'Gippsland', lat: -37.7694, lng: 146.9371, tier: 'region', region: 'gippsland' },
  { id: 'mallee', name: 'The Mallee', aliases: ['mallee'], lat: -35.0833, lng: 142.0, tier: 'region', region: 'loddon-mallee' },
  { id: 'grampians', name: 'Grampians', aliases: ['gariwerd', 'grampians national park'], lat: -37.2329, lng: 142.466, tier: 'region', region: 'grampians' },
  { id: 'mornington-peninsula', name: 'Mornington Peninsula', lat: -38.3675, lng: 144.9934, tier: 'region', region: 'southern-metro' },
  { id: 'yarra-valley', name: 'Yarra Valley', lat: -37.7739, lng: 145.4706, tier: 'region', region: 'eastern-metro' },
  { id: 'goulburn-valley', name: 'Goulburn Valley', lat: -36.4, lng: 145.4, tier: 'region', region: 'goulburn' },
  { id: 'otway-ranges', name: 'Otway Ranges', aliases: ['otways', 'great otway national park'], lat: -38.6833, lng: 143.5, tier: 'region', region: 'barwon-south-west' },
  { id: 'wilsons-promontory', name: 'Wilsons Promontory', aliases: ['the prom', 'wilsons prom'], lat: -39.0, lng: 146.3, tier: 'region', region: 'gippsland' },
  { id: 'dandenong-ranges', name: 'Dandenong Ranges', aliases: ['the dandenongs'], lat: -37.85, lng: 145.35, tier: 'region', region: 'eastern-metro' },
  { id: 'high-country', name: 'Victorian High Country', aliases: ['high country', 'alpine region'], lat: -36.85, lng: 147.3, tier: 'region', region: 'hume' },
  { id: 'wimmera', name: 'Wimmera', lat: -36.5, lng: 142.0, tier: 'region', region: 'grampians' },
  { id: 'loddon', name: 'Loddon Mallee', aliases: ['loddon'], lat: -36.5, lng: 143.5, tier: 'region', region: 'loddon-mallee' },
  { id: 'bellarine-peninsula', name: 'Bellarine Peninsula', aliases: ['bellarine'], lat: -38.18, lng: 144.58, tier: 'region', region: 'barwon-south-west' },
  { id: 'phillip-island', name: 'Phillip Island', lat: -38.49, lng: 145.23, tier: 'region', region: 'gippsland' },
  { id: 'macedon-ranges', name: 'Macedon Ranges', lat: -37.42, lng: 144.58, tier: 'region', region: 'loddon-mallee' },
  { id: 'bass-coast', name: 'Bass Coast', lat: -38.55, lng: 145.55, tier: 'region', region: 'gippsland' },
  { id: 'strzelecki-ranges', name: 'Strzelecki Ranges', lat: -38.4, lng: 146.05, tier: 'region', region: 'gippsland' },
  { id: 'east-gippsland', name: 'East Gippsland', lat: -37.5, lng: 148.2, tier: 'region', region: 'gippsland' },
  { id: 'king-valley', name: 'King Valley', lat: -36.6, lng: 146.4, tier: 'region', region: 'hume' },
  { id: 'sunraysia', name: 'Sunraysia', lat: -34.3, lng: 142.3, tier: 'region', region: 'loddon-mallee' },
  { id: 'western-district', name: 'Western District', lat: -37.9, lng: 142.6, tier: 'region', region: 'barwon-south-west' },

  // ───────────────────────────── SMALL TOWNS ─────────────────────────────
  { id: 'beechworth', name: 'Beechworth', lat: -36.3587, lng: 146.7186, tier: 'smalltown', region: 'hume' },
  { id: 'port-fairy', name: 'Port Fairy', lat: -38.3488, lng: 142.5465, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'maldon', name: 'Maldon', lat: -36.9587, lng: 144.0506, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'heathcote', name: 'Heathcote', lat: -36.9189, lng: 144.7119, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'korumburra', name: 'Korumburra', lat: -38.4301, lng: 145.8211, tier: 'smalltown', region: 'gippsland' },
  { id: 'swifts-creek', name: 'Swifts Creek', lat: -37.0277, lng: 147.4959, tier: 'smalltown', region: 'gippsland' },
  { id: 'harrow', name: 'Harrow', lat: -37.0833, lng: 141.3, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'tarnagulla', name: 'Tarnagulla', lat: -36.75, lng: 143.5, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'walhalla', name: 'Walhalla', lat: -37.9333, lng: 146.45, tier: 'smalltown', region: 'gippsland' },
  { id: 'clunes', name: 'Clunes', lat: -37.7861, lng: 143.7886, tier: 'smalltown', region: 'grampians' },
  { id: 'sorrento', name: 'Sorrento', lat: -38.3393, lng: 144.7519, tier: 'smalltown', region: 'southern-metro' },
  { id: 'queenscliff', name: 'Queenscliff', lat: -38.2725, lng: 144.6637, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'castlemaine', name: 'Castlemaine', lat: -37.0646, lng: 144.2147, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'daylesford', name: 'Daylesford', lat: -37.3, lng: 144.15, tier: 'smalltown', region: 'grampians' },
  { id: 'torquay', name: 'Torquay', lat: -38.332, lng: 144.326, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'anglesea', name: 'Anglesea', lat: -38.408, lng: 144.187, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'lorne', name: 'Lorne', lat: -38.54, lng: 143.974, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'apollo-bay', name: 'Apollo Bay', lat: -38.756, lng: 143.67, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'ocean-grove', name: 'Ocean Grove', lat: -38.262, lng: 144.521, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'barwon-heads', name: 'Barwon Heads', lat: -38.273, lng: 144.488, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'cowes', name: 'Cowes', lat: -38.453, lng: 145.239, tier: 'smalltown', region: 'gippsland' },
  { id: 'inverloch', name: 'Inverloch', lat: -38.633, lng: 145.728, tier: 'smalltown', region: 'gippsland' },
  { id: 'leongatha', name: 'Leongatha', lat: -38.477, lng: 145.945, tier: 'smalltown', region: 'gippsland' },
  { id: 'foster', name: 'Foster', lat: -38.652, lng: 146.2, tier: 'smalltown', region: 'gippsland' },
  { id: 'mirboo-north', name: 'Mirboo North', lat: -38.406, lng: 146.164, tier: 'smalltown', region: 'gippsland' },
  { id: 'warragul', name: 'Warragul', lat: -38.161, lng: 145.932, tier: 'smalltown', region: 'gippsland' },
  { id: 'drouin', name: 'Drouin', lat: -38.133, lng: 145.856, tier: 'smalltown', region: 'gippsland' },
  { id: 'yarram', name: 'Yarram', lat: -38.563, lng: 146.676, tier: 'smalltown', region: 'gippsland' },
  { id: 'maffra', name: 'Maffra', lat: -37.967, lng: 146.987, tier: 'smalltown', region: 'gippsland' },
  { id: 'stratford', name: 'Stratford', lat: -37.967, lng: 147.083, tier: 'smalltown', region: 'gippsland' },
  { id: 'lakes-entrance', name: 'Lakes Entrance', lat: -37.881, lng: 147.981, tier: 'smalltown', region: 'gippsland' },
  { id: 'paynesville', name: 'Paynesville', lat: -37.917, lng: 147.717, tier: 'smalltown', region: 'gippsland' },
  { id: 'metung', name: 'Metung', lat: -37.887, lng: 147.847, tier: 'smalltown', region: 'gippsland' },
  { id: 'orbost', name: 'Orbost', lat: -37.689, lng: 148.457, tier: 'smalltown', region: 'gippsland' },
  { id: 'mallacoota', name: 'Mallacoota', lat: -37.558, lng: 149.76, tier: 'smalltown', region: 'gippsland' },
  { id: 'cann-river', name: 'Cann River', lat: -37.567, lng: 149.156, tier: 'smalltown', region: 'gippsland' },
  { id: 'buchan', name: 'Buchan', lat: -37.5, lng: 148.175, tier: 'smalltown', region: 'gippsland' },
  { id: 'bright', name: 'Bright', lat: -36.73, lng: 146.961, tier: 'smalltown', region: 'hume' },
  { id: 'myrtleford', name: 'Myrtleford', lat: -36.561, lng: 146.724, tier: 'smalltown', region: 'hume' },
  { id: 'mount-beauty', name: 'Mount Beauty', lat: -36.737, lng: 147.17, tier: 'smalltown', region: 'hume' },
  { id: 'omeo', name: 'Omeo', lat: -37.098, lng: 147.594, tier: 'smalltown', region: 'gippsland' },
  { id: 'mansfield', name: 'Mansfield', lat: -37.054, lng: 146.087, tier: 'smalltown', region: 'hume' },
  { id: 'corryong', name: 'Corryong', lat: -36.196, lng: 147.902, tier: 'smalltown', region: 'hume' },
  { id: 'tallangatta', name: 'Tallangatta', lat: -36.218, lng: 147.174, tier: 'smalltown', region: 'hume' },
  { id: 'rutherglen', name: 'Rutherglen', lat: -36.054, lng: 146.461, tier: 'smalltown', region: 'hume' },
  { id: 'yackandandah', name: 'Yackandandah', lat: -36.316, lng: 146.842, tier: 'smalltown', region: 'hume' },
  { id: 'yarrawonga', name: 'Yarrawonga', lat: -36.013, lng: 146.0, tier: 'smalltown', region: 'goulburn' },
  { id: 'cobram', name: 'Cobram', lat: -35.921, lng: 145.647, tier: 'smalltown', region: 'goulburn' },
  { id: 'nagambie', name: 'Nagambie', lat: -36.791, lng: 145.154, tier: 'smalltown', region: 'goulburn' },
  { id: 'euroa', name: 'Euroa', lat: -36.753, lng: 145.571, tier: 'smalltown', region: 'goulburn' },
  { id: 'kyabram', name: 'Kyabram', lat: -36.316, lng: 145.054, tier: 'smalltown', region: 'goulburn' },
  { id: 'tatura', name: 'Tatura', lat: -36.438, lng: 145.233, tier: 'smalltown', region: 'goulburn' },
  { id: 'kerang', name: 'Kerang', lat: -35.733, lng: 143.918, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'robinvale', name: 'Robinvale', lat: -34.583, lng: 142.777, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'ouyen', name: 'Ouyen', lat: -35.07, lng: 142.317, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'sea-lake', name: 'Sea Lake', lat: -35.507, lng: 142.85, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'stawell', name: 'Stawell', lat: -37.056, lng: 142.78, tier: 'smalltown', region: 'grampians' },
  { id: 'halls-gap', name: 'Halls Gap', lat: -37.137, lng: 142.518, tier: 'smalltown', region: 'grampians' },
  { id: 'dimboola', name: 'Dimboola', lat: -36.459, lng: 142.029, tier: 'smalltown', region: 'grampians' },
  { id: 'nhill', name: 'Nhill', lat: -36.333, lng: 141.65, tier: 'smalltown', region: 'grampians' },
  { id: 'warracknabeal', name: 'Warracknabeal', lat: -36.251, lng: 142.394, tier: 'smalltown', region: 'grampians' },
  { id: 'dunkeld', name: 'Dunkeld', lat: -37.652, lng: 142.342, tier: 'smalltown', region: 'grampians' },
  { id: 'st-arnaud', name: 'St Arnaud', lat: -36.616, lng: 143.258, tier: 'smalltown', region: 'grampians' },
  { id: 'avoca', name: 'Avoca', lat: -37.088, lng: 143.475, tier: 'smalltown', region: 'grampians' },
  { id: 'creswick', name: 'Creswick', lat: -37.425, lng: 143.895, tier: 'smalltown', region: 'grampians' },
  { id: 'kyneton', name: 'Kyneton', lat: -37.244, lng: 144.453, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'woodend', name: 'Woodend', lat: -37.358, lng: 144.527, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'camperdown', name: 'Camperdown', lat: -38.236, lng: 143.149, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'terang', name: 'Terang', lat: -38.241, lng: 142.918, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'casterton', name: 'Casterton', lat: -37.587, lng: 141.4, tier: 'smalltown', region: 'barwon-south-west' },
  { id: 'healesville', name: 'Healesville', lat: -37.654, lng: 145.514, tier: 'smalltown', region: 'eastern-metro' },
  { id: 'marysville', name: 'Marysville', lat: -37.513, lng: 145.746, tier: 'smalltown', region: 'hume' },
  { id: 'warburton', name: 'Warburton', lat: -37.753, lng: 145.69, tier: 'smalltown', region: 'eastern-metro' },
  { id: 'belgrave', name: 'Belgrave', lat: -37.909, lng: 145.356, tier: 'smalltown', region: 'eastern-metro' },
  { id: 'emerald', name: 'Emerald', lat: -37.933, lng: 145.443, tier: 'smalltown', region: 'eastern-metro' },
  { id: 'seymour', name: 'Seymour', lat: -37.026, lng: 145.139, tier: 'smalltown', region: 'hume' },
  { id: 'kilmore', name: 'Kilmore', lat: -37.295, lng: 144.951, tier: 'smalltown', region: 'hume' },
  { id: 'alexandra', name: 'Alexandra', lat: -37.19, lng: 145.711, tier: 'smalltown', region: 'hume' },
  { id: 'yea', name: 'Yea', lat: -37.211, lng: 145.429, tier: 'smalltown', region: 'hume' },
  { id: 'wonthaggi', name: 'Wonthaggi', lat: -38.606, lng: 145.592, tier: 'smalltown', region: 'gippsland' },
  { id: 'rochester', name: 'Rochester', lat: -36.359, lng: 144.702, tier: 'smalltown', region: 'loddon-mallee' },
  { id: 'cohuna', name: 'Cohuna', lat: -35.809, lng: 144.217, tier: 'smalltown', region: 'loddon-mallee' },
];

const PLACE_POINTS: LatLng[] = RAW_PLACES.map((p) => ({ lat: p.lat, lng: p.lng }));

function thirdNearestKm(target: LatLng, index: number): number {
  const dists: number[] = [];
  for (let j = 0; j < PLACE_POINTS.length; j++) {
    if (j === index) continue;
    dists.push(haversineKm(target, PLACE_POINTS[j]));
  }
  dists.sort((a, b) => a - b);
  return dists[2] ?? 0;
}

export const PLACES: Place[] = RAW_PLACES.map((p, i) => ({
  ...p,
  scaleKm: thirdNearestKm({ lat: p.lat, lng: p.lng }, i),
}));

export function scaleKmFor(place: Place): number {
  return place.scaleKm;
}

export function placesInRegion(regionId: RegionId): Place[] {
  return PLACES.filter((p) => p.region === regionId);
}

/** Fast id → place lookup, used by the progress / mastery screens. */
export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(
  PLACES.map((p) => [p.id, p]),
);
