INSERT OR IGNORE INTO products (id,name,emoji,category,blurb,description,stock_label,rating,featured,active,sort_order,created_at,updated_at) VALUES
('cuddle','Emergency Cuddle','🤗','Essentials','Priority affection response for cuddle-critical situations.','One immediate Duck & Bear cuddle request, subject only to extreme operational conditions.','In stock',5.0,1,1,10,datetime('now'),datetime('now')),
('breakfast','Breakfast in Bed Upgrade','🥐','Food & Drink','A suspiciously premium room-service experience without the hotel bill.','Breakfast delivered with unreasonable confidence and absolutely no service charge.','Bear kitchen available',4.9,1,1,20,datetime('now'),datetime('now')),
('film','Film Choice Immunity','🎬','Privileges','Choose the film without a 45-minute bilateral negotiation.','A single-use diplomatic instrument granting temporary control of the remote.','Limited diplomatic stock',4.8,0,1,30,datetime('now'),datetime('now')),
('massage','Bear Massage Service','💆','Wellbeing','One highly professional-ish massage from the in-house Bear department.','A relaxing Bear-delivered massage package. Technique varies according to motivation and snack availability.','Appointments available',5.0,1,1,40,datetime('now'),datetime('now')),
('orange','Fresh Orange Juice Reparations','🍊','Food & Drink','For historic beverage incidents and future citrus emergencies.','Fresh orange juice restitution designed to settle disputes involving mysteriously empty glasses.','Oranges permitting',4.7,0,1,50,datetime('now'),datetime('now')),
('durian','Durian Pizza Investigation','🍕','Adventures','A brave scientific inquiry into whether durian belongs on pizza.','One experimental durian pizza mission conducted under controlled relationship conditions.','Questionably in stock',4.6,0,1,60,datetime('now'),datetime('now')),
('snacks','No-Questions-Asked Snack Delivery','🍿','Food & Drink','Snacks appear. Questions do not.','A discreet snack response service for films, bad moods and completely unnecessary second dinners.','Always somehow in stock',5.0,1,1,70,datetime('now'),datetime('now')),
('tandem','Tandem Bicycle Adventure Voucher','🚲','Adventures','Two people, one bicycle, several questionable navigation decisions.','A voucher for a Duck & Bear tandem adventure. International border crossings not automatically included.','Weather dependent',4.9,0,1,80,datetime('now'),datetime('now')),
('aquarium','Aquarium Expedition','🦈','Adventures','Go look at sharks and pretend they are impressed by us.','A fully authorised aquarium outing featuring fish judgement, shark admiration and gift-shop risk.','Ocean adjacent',5.0,1,1,90,datetime('now'),datetime('now')),
('chauffeur','Bear Chauffeur Service','🚗','Privileges','Point-to-point transport with premium Bear commentary included.','One journey operated by Bear Transport Ltd., an organisation with no vehicles registered under that name.','Driver availability applies',4.8,0,1,100,datetime('now'),datetime('now')),
('alpaca','Alpaca Emotional Support Session','🦙','Adventures','For customers emotionally affected by suspiciously friendly alpacas.','A therapeutic alpaca-related package. Actual alpaca participation is not contractually guaranteed.','Alpaca consent required',4.9,0,1,110,datetime('now'),datetime('now')),
('burrito','Blanket Burrito Service','🛏️','Wellbeing','Five minutes of being professionally wrapped and left alone.','A precision blanket-wrapping service for customers requiring immediate burrito status.','Blankets available',5.0,0,1,120,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO earn_rules (id,name,emoji,points,frequency,description,active,sort_order) VALUES
('laugh','Make Zach laugh','😂',10,'daily','Claim once per day.',1,10),
('newthing','Try something new','✨',20,'daily','A new food, place, activity or suitably odd idea.',1,20),
('plandate','Plan a date','🗓️',30,'weekly','A real plan counts. Sitting on the sofa requires management approval.',1,30),
('review','Submit a 5-star review','⭐',25,'once','One-time shameless customer-service bonus.',1,40),
('survive','Survive Bear nonsense','🐻',5,'daily','Self-certification accepted.',1,50);

INSERT OR IGNORE INTO rewards (id,name,emoji,cost,description,active,sort_order,created_at,updated_at) VALUES
('snacktax','Snack Tax Waiver','🍪',20,'Keep 100% of one snack without Bear taxation.',1,10,datetime('now'),datetime('now')),
('veto','Film Veto Token','📺',50,'Reject one proposed film, no appeal process.',1,20,datetime('now'),datetime('now')),
('massage15','15-Minute Massage','💆',75,'A timed Bear massage with no cash surcharge.',1,30,datetime('now'),datetime('now')),
('bedbreakfast','Breakfast in Bed','🍳',100,'Redeem for one breakfast delivery operation.',1,40,datetime('now'),datetime('now')),
('dateupgrade','Date-Night Upgrade','🥂',150,'Upgrade an ordinary date with an extra treat or surprise.',1,50,datetime('now'),datetime('now')),
('mystery','Mystery Yaya Privilege','🎁',250,'Management selects something appropriately excellent.',1,60,datetime('now'),datetime('now'));

INSERT OR IGNORE INTO badges (id,name,emoji,description,secret,active) VALUES
('first-order','First £0 Purchase','🛍️','Placed the first completely free order.',0,1),
('points-100','Triple Digits','💯','Reached 100 Yaya Points.',0,1),
('points-500','Points Hoarder','🏦','Reached 500 Yaya Points.',0,1),
('redeemer','Actually Spent Them','🎟️','Redeemed a loyalty reward.',0,1),
('adventurer','Duck & Bear Explorer','🗺️','Completed an adventure.',0,1),
('reviewer','Official Critic','⭐','Submitted a monthly review.',0,1),
('complainer','Complaints Department Regular','📣','Opened a formal complaint case.',0,1),
('egg-brand','Executive Duck Protocol','🦆','Found the hidden brand control.',1,1),
('egg-green','Green Button Society','💚','Pressed the suspicious green button enough times.',1,1),
('egg-konami','Classified Bear Clearance','🕹️','Entered the ancient classified sequence.',1,1);
