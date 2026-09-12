import {drawBackground} from './mango-mayhem/render/scenery.mjs';
import {drawCharacter} from './mango-mayhem/render/sprites.mjs';
import {mango} from './mango-mayhem/render/primitives.mjs';
const canvas=document.getElementById('mangoCover');if(canvas){const c=canvas.getContext('2d');c.save();c.scale(1,420/540);drawBackground(c,'dublin',850,0,0,{motion:false});c.restore();drawCharacter(c,{x:740,y:405,scale:2.45,tick:40,anim:'celebrate'});mango(c,510,130,30);mango(c,900,150,28);mango(c,550,350,27);}
