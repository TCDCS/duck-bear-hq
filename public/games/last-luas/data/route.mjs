/** Route locations derived from the bounded 2026-09-19 OSM extract. ODbL-1.0.
 * Longitudinal layout is straightened for the illustrated game, not a survey.
 * Heading north from the Green towards the western Dawson platform.
 */
export const ORIGIN={lat:53.33977,lon:-6.25868};
export function chainage(lat,lon){const n=(lat-ORIGIN.lat)*111195,e=(lon-ORIGIN.lon)*66387;return n*.986+.167*e;}
export const ROUTE_LENGTH=chainage(53.34226,-6.258035);
export const FRONTAGES=[
 {id:'south-west',s:6,w:17,h:13,side:-1,style:'town',colour:'#ad7869',floors:3,seed:1},
 {id:'south-east',s:9,w:20,h:12,side:1,style:'stone',colour:'#d3bd9f',floors:3,seed:2},
 {id:'west-terrace',s:28,w:16,h:14,side:-1,style:'town',colour:'#b98c76',floors:4,seed:3},
 {id:'mansion',s:39,w:25,h:12,side:1,style:'mansion',colour:'#e4d1b5',floors:3,seed:4},
 {id:'west-brick',s:47,w:17,h:13.5,side:-1,style:'town',colour:'#ad7666',floors:3,seed:5},
 {id:'east-stone',s:65,w:17,h:15,side:1,style:'stone',colour:'#cfc9b9',floors:4,seed:6},
 {id:'west-doorways',s:66,w:15,h:14,side:-1,style:'town',colour:'#b58e78',floors:4,seed:7},
 {id:'cafe',name:'Café en Seine',s:chainage(53.3407232,-6.2585998),w:17,h:13.5,side:-1,style:'cafe',colour:'#c1927c',floors:3,seed:8,brand:'cafe',osm:'node/10601110758'},
 {id:'academy',name:'Royal Irish Academy',s:105,w:17,h:14,side:1,style:'academy',colour:'#a77b68',floors:4,seed:9},
 {id:'west-corner',s:126,w:16,h:13,side:-1,style:'stone',colour:'#ccc3ab',floors:3,seed:10},
 {id:'east-terrace',s:128,w:15,h:14.5,side:1,style:'town',colour:'#ac7f6b',floors:4,seed:11},
 {id:'west-anne',s:146,w:18,h:14,side:-1,style:'town',colour:'#a87568',floors:4,seed:12},
 {id:'east-corner',s:147,w:17,h:13.4,side:1,style:'stone',colour:'#d4c7ae',floors:3,seed:13},
 {id:'ivy',name:'The Ivy',s:chainage(53.3414179,-6.258002),w:32,h:16,side:1,style:'ivy',colour:'#dcd4c3',floors:4,seed:14,brand:'ivy',osm:'node/5892492050'},
 {id:'west-modern',s:175,w:23,h:15,side:-1,style:'stone',colour:'#c4b8a7',floors:4,seed:15},
 {id:'west-shop',s:199,w:17,h:14,side:-1,style:'town',colour:'#b78670',floors:3,seed:16},
 {id:'east-duke',s:210,w:22,h:16,side:1,style:'stone',colour:'#d4c5b0',floors:4,seed:17},
 {id:'west-sandstone',s:217,w:14,h:14.5,side:-1,style:'town',colour:'#c9b596',floors:4,seed:18},
 {id:'pret',name:'Pret A Manger',s:chainage(53.342025,-6.25819),w:8.5,h:13,side:-1,style:'pret',colour:'#d2c7af',floors:3,seed:19,brand:'pret',osm:'way/268846478'},
 {id:'dawson-house',s:chainage(53.342105,-6.25818),w:9,h:16,side:-1,style:'town',colour:'#ad7a69',floors:4,seed:20},
 {id:'hodges',name:'Hodges Figgis',s:chainage(53.342265,-6.25812),w:19,h:15,side:-1,style:'hodges',colour:'#b8816e',floors:4,seed:21,brand:'hodges',osm:'way/268846475'},
 {id:'platform-east',s:253,w:20,h:14,side:1,style:'town',colour:'#cba28a',floors:3,seed:22},
 {id:'north-east',s:277,w:18,h:16,side:1,style:'stone',colour:'#c5c3b9',floors:4,seed:23},
 {id:'north-west',s:307,w:22,h:18,side:-1,style:'stone',colour:'#d4ccbd',floors:4,seed:24},
 {id:'north-corner',s:317,w:25,h:14,side:1,style:'town',colour:'#bb9883',floors:3,seed:25}
];
export const ROUTE_NOTE='Northbound Dawson Street. Main business order and stop placement use OpenStreetMap; architecture is an illustrated interpretation, not a measured replica.';
