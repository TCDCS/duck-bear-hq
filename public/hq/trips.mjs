import {esc,pageHead} from './client.mjs';

const MAPS=q=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);
const route=(from,to)=>'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(from)+'&destination='+encodeURIComponent(to);
const external=(href,label,kind='secondary')=>`<a class="button ${kind}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const photo=(src,alt,caption)=>`<figure class="trip-photo"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer"><figcaption>${esc(caption)}</figcaption></figure>`;
const wikimedia=name=>'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(name)+'?width=1400';

const PRAGUE={
  title:'Guannan · Prague',
  dates:'3–7 October 2026',
  hotel:'Congress & Wellness Hotel Olšanka · Táboritská 23/1000, Prague 3',
  days:[
    {date:'Sat 3 Oct',title:'Žižkov evening',summary:'Local first night. No transport ticket needed after 17:00.',stops:[
      ['17:00','Walk from Olšanka','Hotel → Jiřího z Poděbrad. Easy first evening close to the hotel.'],
      ['17:35','Žižkov TV Tower + Mahlerovy sady','See the tower and park area around sunset.'],
      ['19:00','Dinner · Pivnice U Sadu','Škroupovo nám. 5 · target 250–400 CZK.'],
      ['20:30','Walk back','Simple walk back to the hotel.']
    ],links:[['Hotel → Jiřího z Poděbrad',route('Congress & Wellness Hotel Olšanka, Prague','Jiřího z Poděbrad, Prague')],['Pivnice U Sadu',MAPS('Pivnice U Sadu Prague')]]},
    {date:'Sun 4 Oct',title:'Museum of Senses + Wenceslas Square',summary:'Use one 30-minute ticket each way on tram 9.',stops:[
      ['17:00','Tram 9 · Olšanské náměstí → Jindřišská','Direction Sídliště Řepy. Stops: Lipanská, Husinecká, Hlavní nádraží, Jindřišská.'],
      ['17:20','Museum of Senses','Jindřišská 939/20 · 390 CZK · allow 75–90 minutes.'],
      ['18:50','Wenceslas Square','Easy walk from the museum.'],
      ['19:15','Franciscan Garden','Short optional stop if still open.'],
      ['19:50','Tram 9 back','Direction Spojovací · get off Lipanská.'],
      ['20:10','Dinner · Restaurant Lavička','Seifertova 303/77 · target 250–450 CZK.']
    ],links:[['Museum of Senses',MAPS('Museum of Senses Prague')],['Restaurant Lavička',MAPS('Restaurant Lavička Prague')]]},
    {date:'Mon 5 Oct',title:'Museum of Communism + Republic Square',summary:'Old/New Town evening with one tram ticket each way.',stops:[
      ['17:00','Tram 9 to Jindřišská','Then walk about 8–10 minutes.'],
      ['17:30','Museum of Communism','V Celnici 1031/4 · 390 CZK.'],
      ['19:00','Náměstí Republiky','Powder Tower and Municipal House exterior.'],
      ['19:40','Dinner · Lokál Dlouhááá','Dlouhá 33 · target 250–400 CZK.'],
      ['21:15','Walk + tram 9 back','Return from Jindřišská toward Spojovací.']
    ],links:[['Museum of Communism',MAPS('Museum of Communism Prague')],['Lokál Dlouhááá',MAPS('Lokál Dlouhááá Prague')]]},
    {date:'Tue 6 Oct',title:'Cubism + Old Town',summary:'Best night for the saved Old Town photo spots.',stops:[
      ['17:00','Tram 9 to Jindřišská','Then walk about 10 minutes.'],
      ['17:30','House at the Black Madonna','Ovocný trh 19 · 150 CZK.'],
      ['18:35','Old Town Square','Týn Church, square and Astronomical Clock.'],
      ['19:05','Optional · Idiom book tower','Municipal Library · go before 19:30; queues can be long.'],
      ['19:35','Optional · Hanging Man','Husova · useful on the walk back.'],
      ['20:15','Tram 9 back','Direction Spojovací · get off Lipanská.'],
      ['20:40','Dinner · Pivnice U Járy','Dalimilova 1 · target 190–350 CZK.']
    ],links:[['House at the Black Madonna',MAPS('House at the Black Madonna Prague')],['Old Town Square',MAPS('Old Town Square Prague')],['Idiom book tower',MAPS('Municipal Library of Prague Idiom')],['Pivnice U Járy',MAPS('Pivnice U Járy Prague')]]},
    {date:'Wed 7 Oct',title:'Airport + flight home',summary:'Leave the hotel about 08:00 Prague time.',stops:[
      ['08:00','Leave Olšanka','Walk to Flora.'],
      ['08:15','Metro A · Flora → Nádraží Veleslavín','Direction Nemocnice Motol.'],
      ['09:00','Trolleybus 59 → Airport','Use one 90-minute PID ticket for the full airport journey.'],
      ['11:50','Aer Lingus EI0643 · Prague → Dublin','Departure is Prague local time. Arrives Dublin 13:25.']
    ],links:[['Hotel → Prague Airport',route('Congress & Wellness Hotel Olšanka, Prague','Václav Havel Airport Prague')]]}
  ]
};

const ROAD={
  title:'France + Belgium Road Trip',
  dates:'9–18 October 2026',
  days:[
    {date:'Fri 9 Oct',title:'Dublin → ferry',summary:'Start of the road trip.',stops:[
      ['15:30','Leave Rathingle','Drive to Dublin Port.'],
      ['17:00','Aim to be at Dublin Ferryport','Irish Ferries vehicle check-in closes at 17:30 for this France sailing.'], 
      ['18:30','Irish Ferries departs Dublin','Overnight cabin to Cherbourg.']
    ]},
    {date:'Sat 10 Oct',title:'Cherbourg → Rouen',summary:'Long first drive after the ferry.',stops:[
      ['15:30','Arrive Cherbourg','France local time.'], 
      ['16:15','Drive to Rouen','About 3–3.25 hours including a short stop.'],
      ['~19:30','Check in · Urban Style Hotel de l’Europe','87 rue aux Ours. Parking de la Pucelle about 50 m away.'],
      ['20:15','Rouen evening','Rouen à Table! / cathedral atmosphere, then L’Entrepôt Food Hall if needed.']
    ],links:[['Cherbourg → Rouen',route('Cherbourg Ferry Terminal','Urban Style Hotel de l’Europe Rouen')],['Hotel',MAPS("Urban Style Hotel de l'Europe Rouen")]]},
    {date:'Sun 11 Oct',title:'Rouen → Nausicaá → Jurbise',summary:'Early start for Nausicaá, then La Cure. The two Nausicaá vouchers are verified.',status:'VERIFIED',stops:[
      ['06:30','Leave Rouen','Drive toward Boulogne-sur-Mer.'],
      ['09:10','Park near Nausicaá','Try Q-Park Nausicaá.'],
      ['09:30–14:00','Nausicaá · vouchers verified','Two Social Deal vouchers are verified. Keep the aquarium visit in the confirmed trip plan.'], 
      ['14:00','Drive to Jurbise','Allow roughly 2.5–3 hours from Boulogne-sur-Mer.'], 
      ['~16:45–18:00','Check in · La Cure de Masnuy-Saint-Pierre','Rue Lieutenant de Saint-Martin 1, Jurbise. Confirmed and paid. Check-in closes at 18:00.']
    ],links:[['Nausicaá',MAPS('Nausicaá Boulogne-sur-Mer')],['Nausicaá → La Cure',route('Nausicaá Boulogne-sur-Mer','La Cure de Masnuy-Saint-Pierre Jurbise')]]},
    {date:'Mon 12 Oct',title:'Pairi Daiza · day 1 + Edenya',summary:'Tickets and parking are booked. Edenya is booked 10:00–12:00.',status:'BOOKED',stops:[
      ['~09:00','Drive to Pairi Daiza','Allow time to park and get through the entrance.'],
      ['10:00–12:00','Edenya · booked','2 × Edenya entry. This replaces the older workbook note that treated Edenya as optional.'],
      ['Rest of day','Pairi Daiza · day 1','Full park day. Entry and one-day parking are booked.'],
      ['After closing','Food + recharge','Eat in the park or keep dinner simple back at La Cure in Jurbise.']
    ],links:[['Pairi Daiza',MAPS('Pairi Daiza Brugelette Belgium')],['La Cure → Pairi Daiza',route('La Cure de Masnuy-Saint-Pierre Jurbise','Pairi Daiza')]]},
    {date:'Tue 13 Oct',title:'Pairi Daiza · day 2 → Bruges',summary:'Second full zoo day, then drive to Bruges.',status:'BOOKED',stops:[
      ['08:00–09:00','Pack + check out','La Cure check-out is 08:00–10:00. There is no breakfast included.'], 
      ['At opening','Pairi Daiza · day 2','Entry and one-day parking are booked.'], 
      ['After closing','Drive to Bruges','About 1.5–2 hours.'],
      ['20:00','Check in · InnBrugas B&B','Expected arrival is 20:00. Garage is booked for both nights.'], 
      ['After check-in','Dinner · FritBar','Loaded fries · target €32–40.']
    ],links:[['Pairi Daiza → InnBrugas',route('Pairi Daiza','InnBrugas B&B Brugge')],['InnBrugas',MAPS('InnBrugas B&B Nikolaas Gombertstraat 21 Brugge')]]},
    {date:'Wed 14 Oct',title:'Bruges full day',summary:'Photos, Belfry, canal, Historium, museums and evening drinks.',stops:[
      ['07:45–08:45','Early photo walk','Boniface Bridge → Arentshof → Rozenhoedkaai → canals.'],
      ['08:45','Breakfast · That’s Toast','Target €20–30.'],
      ['~10:00','Bruges Belfry','2 adults · 366 steps.'],
      ['11:15–12:00','Canal boat','Buy at the jetty with the shortest queue.'],
      ['12:15–14:00','Historium Story + VR','Planned visit.'],
      ['15:00–16:15','Witchcraft + Torture Museums','Combo visit.'],
      ['16:20','Old Chocolate House + Otto Waffle Atelier','Share if useful.'],
      ['18:30','Dinner · De Republiek','Target €30–50.'],
      ['20:00–22:00','Le Trappiste + night photos','Finish at Rozenhoedkaai / Burg / canals.']
    ],links:[['Rozenhoedkaai',MAPS('Rozenhoedkaai Bruges')],['Bruges Belfry',MAPS('Belfry of Bruges')],['Historium',MAPS('Historium Bruges')]]},
    {date:'Thu 15 Oct',title:'Bruges → Le Bourget → BisouX Caen',summary:'Aviation museum, then the planned BisouX Love Room stay. Reconfirmation is still pending.',status:'AWAITING RECONFIRMATION',stops:[
      ['08:30','Leave Bruges','Pay ’t Zand and head for Le Bourget.'],
      ['~11:15','Park · Musée de l’Air et de l’Espace','Planned museum day.'],
      ['11:30–13:30','Museum block 1','Full passes planned.'],
      ['13:30–14:00','Lunch · L’Hélice','Museum restaurant.'],
      ['14:00–16:30','Museum block 2','Finish the museum before the drive.'],
      ['16:40','Drive to BisouX Caen','About 2h18 baseline from Le Bourget.'], 
      ['~19:15','BisouX Caen · awaiting reconfirmation','Keep BisouX in the plan for 15–16 October. Original details: Love Room, 35 Avenue Daniel Bruand, self check-in from 18:30, check-out by 10:00 and gravel courtyard parking. Waiting for BisouX to reconfirm.'], 
      ['Before bed','Contact Le Saint Aubert','Ask for the next-day barrier code.']
    ],links:[['Le Bourget museum',MAPS("Musée de l'Air et de l'Espace Le Bourget")],['Le Bourget → BisouX',route("Musée de l'Air et de l'Espace","35 Avenue Daniel Bruand 14112 Biéville-Beuville France")]]},
    {date:'Fri 16 Oct',title:'BisouX Caen → Mont-Saint-Michel',summary:'Windmill, Abbey, Alligator Bay, Le Saint Aubert check-in and dusk photos.',stops:[
      ['07:45–08:00','Leave BisouX Caen','Planned departure from BisouX; reconfirm the stay before travel.'], 
      ['10:00–10:35','Moulin de Moidrey','Quick visit before the Mont.'],
      ['10:45','Le Saint Aubert / hotel parking area','Contact the hotel on 15 October for the one-time access code. October parking is listed as €10 per 24 hours.'], 
      ['11:45–13:00','Mont-Saint-Michel Abbey','Main visit.'],
      ['13:00–13:35','Lunch · Crêperie La Cloche','Only if there is no wait; otherwise takeaway.'],
      ['14:30–16:15','Alligator Bay','Reconfirm October hours before travel.'],
      ['16:15–17:00','Check in · Le Saint Aubert','Confirmed one-night stay. Check-in 16:00–19:00; breakfast included; double-bed request approved.'], 
      ['18:15–21:30','Dusk/night Mont photos','Budget takeaway + walk one direction on the causeway.']
    ],links:[['Mont-Saint-Michel',MAPS('Mont-Saint-Michel Abbey')],['Alligator Bay',MAPS('Alligator Bay Beauvoir France')]]},
    {date:'Sat 17 Oct',title:'D-Day Experience → Cherbourg ferry',summary:'Museum morning, then ferry home.',stops:[
      ['08:30','Leave Mont-Saint-Michel','Drive toward Saint-Côme-du-Mont.'],
      ['10:00–12:00','D-Day Experience · Option 2','Museums + hologram + C-47 simulator. Same-day simulator entry is not available.'],
      ['12:00–13:00','Optional lunch · Les Ponts d’Ouve','Use if timing works.'],
      ['13:00','Drive toward Cherbourg','Allow a flexible stop for waterfront / café / shopping.'],
      ['15:30–16:15','Fuel + ferry snacks','Do this before port check-in.'],
      ['18:00','Arrive Cherbourg ferry terminal','Latest vehicle check-in is 18:30. Aim for about 18:00.'], 
      ['19:30 local','Irish Ferries · Cherbourg → Dublin','Calendar: 18:30 Dublin time. Overnight cabin.']
    ],links:[['D-Day Experience',MAPS('D-Day Experience Saint-Côme-du-Mont')],['D-Day Experience → Cherbourg',route('D-Day Experience Saint-Côme-du-Mont','Cherbourg Ferry Terminal')]]},
    {date:'Sun 18 Oct',title:'Arrive Dublin',summary:'End of the road trip.',stops:[
      ['Morning','On board','Cabin / breakfast / pack.'],
      ['14:30','Arrive Dublin','Calendar arrival time, then drive home.']
    ]}
  ]
};

function calendarEvents(items){return `<section class="trip-section"><div class="section-title"><h2>From the shared calendar</h2></div><div class="trip-calendar">${items.map(([when,title,detail])=>`<article><span class="trip-badge calendar">CALENDAR</span><strong>${esc(when)}</strong><h3>${esc(title)}</h3><p>${esc(detail)}</p></article>`).join('')}</div></section>`;}
function stopList(stops){return `<div class="trip-stops">${stops.map(([time,title,detail])=>`<div class="trip-stop"><time>${esc(time)}</time><div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div></div>`).join('')}</div>`;}
function days(items){return `<section class="trip-section" id="days"><div class="section-title"><h2>Day by day</h2><span class="muted">Tap a day to open it</span></div><div class="trip-days">${items.map((d,i)=>`<details class="trip-day" ${i===0?'open':''} id="day-${i+1}"><summary><div><span>${esc(d.date)}</span><strong>${esc(d.title)}</strong></div>${d.status?`<b class="trip-badge booked">${esc(d.status)}</b>`:'<b aria-hidden="true">＋</b>'}</summary><div class="trip-day-body"><p class="trip-day-summary">${esc(d.summary)}</p>${stopList(d.stops)}${d.links?.length?`<div class="actions">${d.links.map(([label,href])=>external(href,label)).join('')}</div>`:''}</div></details>`).join('')}</div></section>`;}
function jump(items){return `<nav class="trip-jump" aria-label="Trip days"><a href="#calendar">Calendar</a>${items.map((d,i)=>`<a href="#day-${i+1}">${esc(d.date.replace('Oct',''))}</a>`).join('')}<a href="#useful">Useful</a></nav>`;}
function attribution(items){return `<p class="trip-credit">Destination photography: ${items.map(([label,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`).join(' · ')}. Creative Commons licences are listed on the source pages.</p>`;}

function hub(A){A.content.innerHTML=pageHead('PLANS & ADVENTURES','Trips','The useful bits for each trip, built for a phone: dates, bookings, routes, hotels and the day-by-day plan.')+`<div class="trip-hub-grid"><a class="trip-hub-card prague" href="/plans/prague/"><img src="${wikimedia('Astronomical Clock.JPG')}" alt="Prague Astronomical Clock" loading="eager" referrerpolicy="no-referrer"><div><span class="trip-badge">GUANNAN</span><h2>Prague</h2><p>3–7 October · evening itinerary, transport, maps and flights.</p><strong>Open Prague →</strong></div></a><a class="trip-hub-card road" href="/plans/france-belgium/"><img src="${wikimedia('BE-brugge-rozenhoedkai.jpg')}" alt="Rozenhoedkaai and the canals of Bruges" loading="eager" referrerpolicy="no-referrer"><div><span class="trip-badge">ZACH + GUANNAN</span><h2>France + Belgium</h2><p>9–18 October · ferry, hotels, Pairi Daiza, Bruges and Normandy.</p><strong>Open road trip →</strong></div></a></div>`;}

function prague(A){A.content.innerHTML=pageHead('PRAGUE · 3–7 OCTOBER','Guannan’s Prague trip','Everything useful from the trip workbook and the shared calendar, without the clutter.',`<div class="actions">${external(MAPS('Congress & Wellness Hotel Olšanka Prague'),'Hotel map')}</div>`)+jump(PRAGUE.days)+`<section class="trip-hero"><div class="trip-hero-copy"><span class="trip-badge">4 NIGHTS · SOLO TRIP</span><h2>Easy evenings from Olšanka</h2><p>The plan keeps each evening fairly close to the hotel and uses tram 9 as the simple route into the centre.</p><dl class="trip-facts"><div><dt>Hotel</dt><dd>${esc(PRAGUE.hotel)}</dd></div><div><dt>Airport</dt><dd>59 trolleybus + Metro A via Nádraží Veleslavín and Flora.</dd></div><div><dt>Tickets</dt><dd>30 min 36 CZK · 90 min 46 CZK · 24h 140 CZK · 72h 340 CZK.</dd></div><div><dt>Core spend</dt><dd>About 2,178–2,838 CZK (€89–€116), excluding hotel/flights.</dd></div></dl></div><figure class="trip-hero-image"><img src="${wikimedia('Astronomical Clock.JPG')}" alt="Prague Astronomical Clock in Old Town Square" loading="eager" referrerpolicy="no-referrer"><figcaption>Old Town is saved for Tuesday evening.</figcaption></figure></section><section class="notice trip-notice"><strong>Transport:</strong> Prague is not normal tap-in/tap-out. Use PID Lítačka or buy/validate the right ticket. A Revolut/contactless card can be used at suitable ticket terminals.</section><div id="calendar"></div>${calendarEvents([
['Sat 3 Oct · 07:25 Dublin','EI0642 · Dublin → Prague','Arrives Prague 11:10 local time.'],
['Wed 7 Oct · 11:50 Prague','EI0643 · Prague → Dublin','Arrives Dublin 13:25 local time.']
])}${days(PRAGUE.days)}<section class="trip-section"><div class="section-title"><h2>Saved photo stops</h2></div><div class="trip-photo-grid">${photo(wikimedia('Astronomical Clock.JPG'),'Prague Astronomical Clock','Astronomical Clock · Tuesday')}${photo(wikimedia('Old Town Square, Prague 05.jpg'),'Old Town Square in Prague','Old Town Square · Tuesday')}${photo(wikimedia('Praha - Staroměstská radnice.jpg'),'Prague Old Town Hall','Old Town Hall · Tuesday')}${photo(wikimedia('Prague Old Town Hall, astronomical clock, c1919.jpg'),'Historic Prague Old Town Hall image','Old Town detail')}</div></section><section class="trip-section" id="useful"><div class="section-title"><h2>Useful on the phone</h2></div><div class="trip-link-grid"><article><span>🚋</span><h3>Getting around</h3><p>Use PID Lítačka for live routes and ticket options. Planned transport is about 308 CZK total.</p>${external('https://pidlitacka.cz/en','PID Lítačka')}</article><article><span>✈️</span><h3>Airport route</h3><p>Walk to Flora → Metro A → Nádraží Veleslavín → trolleybus 59.</p>${external(route('Congress & Wellness Hotel Olšanka, Prague','Václav Havel Airport Prague'),'Open airport route')}</article><article><span>📍</span><h3>Hotel</h3><p>Congress & Wellness Hotel Olšanka, Táboritská 23/1000, Prague 3.</p>${external(MAPS('Congress & Wellness Hotel Olšanka Prague'),'Open hotel map')}</article></div></section>${attribution([['Prague clock · J. Miers / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Astronomical_Clock.JPG'],['Old Town Square / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Old_Town_Square,_Prague_05.jpg'],['Old Town Hall / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Praha_-_Starom%C4%9Bstsk%C3%A1_radnice.jpg']])}`;}

function road(A){A.content.innerHTML=pageHead('FRANCE + BELGIUM · 9–18 OCTOBER','France + Belgium road trip','Ferry, hotels, attraction days and the route in one mobile page. Booking references and access PINs are deliberately left off the page.',`<div class="actions">${external(MAPS('Pairi Daiza'),'Pairi Daiza map')}</div>`)+jump(ROAD.days)+`<section class="trip-hero road"><div class="trip-hero-copy"><span class="trip-badge">10 DAYS · ROAD TRIP</span><h2>Dublin → Normandy → Belgium → Normandy → Dublin</h2><p>The updated workbook is the base plan. Shared-calendar bookings override older notes where they differ.</p><dl class="trip-facts"><div><dt>Ferry out</dt><dd>Fri 9 Oct · depart Dublin 18:30. Vehicle check-in closes 17:30; aim for 17:00.</dd></div><div><dt>Arrive France</dt><dd>Sat 10 Oct · Cherbourg 15:30.</dd></div><div><dt>Pairi Daiza</dt><dd>12–13 Oct · 2 adults + parking booked both days.</dd></div><div><dt>Ferry home</dt><dd>Sat 17 Oct · 19:30 Cherbourg local. Arrive Dublin Sun 18 Oct 14:30.</dd></div></dl></div><figure class="trip-hero-image"><img src="${wikimedia('BE-brugge-rozenhoedkai.jpg')}" alt="Rozenhoedkaai and canals in Bruges" loading="eager" referrerpolicy="no-referrer"><figcaption>Bruges · 13–15 October.</figcaption></figure></section><div id="calendar"></div>${calendarEvents([
['Fri 9 Oct','Ferry out','Aim for Dublin Port 17:00 · latest check-in 17:30 · sailing 18:30.'], 
['Sat 10 Oct · 15:30 France time','Arrive France','Cherbourg arrival, then drive to Rouen.'],
['Sun 11 Oct · 09:30','Nausicaá · verified','Two Social Deal vouchers are verified.'], 
['Sun 11–Tue 13 Oct','La Cure · confirmed','Jurbise · 2 nights · check-in 15:00–18:00 · check-out by 10:00 Tuesday.'],
['Mon 12–Tue 13 Oct','Pairi Daiza · booked','2 adult entries + one-day parking for both days.'], 
['Mon 12 Oct · 10:00–12:00','Edenya · booked','2 entries. This is the confirmed slot from the calendar.'],
['Tue 13–Thu 15 Oct','InnBrugas · confirmed','Bruges · garage + breakfast booked · expected arrival 20:00.'],
['Thu 15–Fri 16 Oct','BisouX Caen · awaiting reconfirmation','Keep in the route as the intended Love Room stay; waiting for the property to reconfirm.'],
['Fri 16–Sat 17 Oct','Le Saint Aubert · confirmed','One night · breakfast included · check-in 16:00–19:00.'], 
['Sat 17 Oct · 19:30 local','Cherbourg → Dublin','Overnight ferry; arrives Dublin Sun 18 Oct at 14:30.']
])}<section class="trip-section"><div class="section-title"><h2>Route at a glance</h2></div><div class="trip-route"><div>🇮🇪 <strong>Dublin</strong><small>9 Oct</small></div><span>→</span><div>🇫🇷 <strong>Rouen</strong><small>10 Oct</small></div><span>→</span><div>🐠 <strong>Nausicaá</strong><small>11 Oct</small></div><span>→</span><div>🇧🇪 <strong>Jurbise</strong><small>11–13</small></div><span>→</span><div>🐼 <strong>Pairi Daiza</strong><small>12–13</small></div><span>→</span><div>🇧🇪 <strong>Bruges</strong><small>13–15</small></div><span>→</span><div>✈️ <strong>Le Bourget</strong><small>15 Oct</small></div><span>→</span><div>❤️ <strong>BisouX Caen</strong><small>15 Oct · awaiting reconfirmation</small></div><span>→</span><div>🏰 <strong>Mont-Saint-Michel</strong><small>16 Oct</small></div><span>→</span><div>🎖️ <strong>D-Day Experience</strong><small>17 Oct</small></div><span>→</span><div>⛴️ <strong>Cherbourg</strong><small>17 Oct</small></div></div></section>${days(ROAD.days)}<section class="trip-section"><div class="section-title"><h2>Places to look forward to</h2></div><div class="trip-photo-grid">${photo(wikimedia('Rouen-cathedral.jpg'),'Rouen Cathedral at sunset','Rouen · Saturday night')}${photo(wikimedia('Pairi-Daiza.jpg'),'Pairi Daiza in Belgium','Pairi Daiza · Monday + Tuesday')}${photo(wikimedia('BE-brugge-rozenhoedkai.jpg'),'Rozenhoedkaai in Bruges','Bruges · Wednesday photo route')}${photo(wikimedia('Panorama de la baie du Mont Saint-Michel.jpg'),'Panorama of Mont-Saint-Michel bay','Mont-Saint-Michel · Friday')}</div></section><section class="trip-section" id="useful"><div class="section-title"><h2>Hotels + parking</h2></div><div class="trip-hotel-grid"><article><span>10–11 Oct</span><h3>Urban Style Hotel de l’Europe · Rouen</h3><p>87 rue aux Ours. Confirmed one night. Check-in 15:00–23:30; check-out 06:30–11:00. Breakfast is optional at €15 per person.</p></article><article><span>11–13 Oct</span><h3>La Cure de Masnuy-Saint-Pierre · Jurbise</h3><p>Confirmed and paid. Check-in 15:00–18:00; check-out 08:00–10:00. Two-bedroom apartment; no meal option included.</p></article><article><span>13–15 Oct</span><h3>InnBrugas B&B · Bruges</h3><p>Nikolaas Gombertstraat 21. Expected arrival 20:00. Garage is booked for both nights and breakfast buffet for both mornings.</p></article><article><span>15–16 Oct</span><h3>BisouX Caen · awaiting reconfirmation</h3><p>Keep this as the intended stay. Love Room at 35 Avenue Daniel Bruand, Biéville-Beuville; self check-in from 18:30, check-out by 10:00 and gravel courtyard parking. Waiting for the property to reconfirm.</p></article><article><span>16–17 Oct</span><h3>Le Saint Aubert · Mont-Saint-Michel</h3><p>Confirmed one night. Check-in 16:00–19:00; check-out 07:00–11:00. Breakfast included; double-bed request approved. Contact the hotel on 15 Oct for the one-time parking/access code; October parking is €10 per 24h.</p></article></div><div class="notice trip-notice"><strong>Current status:</strong> Nausicaá vouchers are verified. BisouX Caen stays in the plan for 15–16 October and is awaiting reconfirmation. The other accommodation shown here is confirmed.</div><div class="notice trip-notice"><strong>Kept private:</strong> booking confirmation numbers, payment references and access PINs are not shown here.</div></section>${attribution([['Rouen · Kaelkael / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Rouen-cathedral.jpg'],['Pairi Daiza · Arnau Domènech / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Pairi-Daiza.jpg'],['Bruges · Balou46 / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:BE-brugge-rozenhoedkai.jpg'],['Mont-Saint-Michel · Obit / Wikimedia Commons','https://commons.wikimedia.org/wiki/File:Panorama_de_la_baie_du_Mont_Saint-Michel.jpg']])}`;}

export async function tripsView(A,route){if(route.tab==='prague')return prague(A);if(route.tab==='france-belgium')return road(A);return hub(A);}
