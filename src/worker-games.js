import original from "./index.js";
import {createGameHandler} from "./game-routes.js";
import asset0 from "./kart-assets/index.html.txt";
import asset1 from "./kart-assets/game.css.txt";
import asset2 from "./kart-assets/wacky.css.txt";
import asset3 from "./kart-assets/portraits.js.txt";
import asset4 from "./kart-assets/core.js.txt";
import asset5 from "./kart-assets/models.js.txt";
import asset6 from "./kart-assets/scenery.js.txt";
import asset7 from "./kart-assets/shaders.js.txt";
import asset8 from "./kart-assets/renderer.js.txt";
import asset9 from "./kart-assets/motion.js.txt";
import asset10 from "./kart-assets/audio.js.txt";
import asset11 from "./kart-assets/game.js.txt";
import asset12 from "./kart-assets/host.js.txt";
const assets=new Map([
  ['index.html',{body:asset0,type:'text/html; charset=utf-8'}],
  ['game.css',{body:asset1,type:'text/css; charset=utf-8'}],
  ['wacky.css',{body:asset2,type:'text/css; charset=utf-8'}],
  ['portraits.js',{body:asset3,type:'text/javascript; charset=utf-8'}],
  ['core.js',{body:asset4,type:'text/javascript; charset=utf-8'}],
  ['models.js',{body:asset5,type:'text/javascript; charset=utf-8'}],
  ['scenery.js',{body:asset6,type:'text/javascript; charset=utf-8'}],
  ['shaders.js',{body:asset7,type:'text/javascript; charset=utf-8'}],
  ['renderer.js',{body:asset8,type:'text/javascript; charset=utf-8'}],
  ['motion.js',{body:asset9,type:'text/javascript; charset=utf-8'}],
  ['audio.js',{body:asset10,type:'text/javascript; charset=utf-8'}],
  ['game.js',{body:asset11,type:'text/javascript; charset=utf-8'}],
  ['host.js',{body:asset12,type:'text/javascript; charset=utf-8'}],
]);
export default createGameHandler({assets,fallback:original});
