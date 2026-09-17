export const ARENAS=Object.freeze([
 {id:'wrestling-arena',name:'Wrestling Arena',size:[24,18],primary:'#d94b3d',secondary:'#f6ca3b'},
 {id:'dublin-docks',name:'Dublin Docks',size:[28,20],primary:'#2e7183',secondary:'#ed7749'},
 {id:'london-underground',name:'London Underground',size:[28,18],primary:'#263b6a',secondary:'#e33b42'},
 {id:'mango-market',name:'Mango Market',size:[27,19],primary:'#f59e2f',secondary:'#42b67a'},
 {id:'temple-courtyard',name:'Temple Courtyard',size:[26,20],primary:'#a73338',secondary:'#e8c56f'},
 {id:'sichuan-tea-house',name:'Sichuan Tea House',size:[25,18],primary:'#8f2f45',secondary:'#dfbd70'},
 {id:'ice-festival',name:'Ice Festival',size:[28,20],primary:'#5cc8db',secondary:'#d8f2ff'},
 {id:'house-party',name:'House Party',size:[23,18],primary:'#8556b8',secondary:'#ffbd55'},
 {id:'toy-factory',name:'Toy Factory',size:[28,20],primary:'#1e7d8d',secondary:'#f05261'},
 {id:'cruise-ship',name:'Cruise Ship',size:[30,20],primary:'#2e85b8',secondary:'#fff0ad'},
 {id:'mad-circus',name:'Mad Circus',size:[28,21],primary:'#c93653',secondary:'#38c4b5'}
]);

export const CHARACTERS=Object.freeze([
 {id:'character-hero',name:'Hero',body:'#27C8B9',accent:'#FFD84F'},
 {id:'character-stephen',name:'Stephen',body:'#F07B4B',accent:'#2D3448'},
 {id:'character-zachary',name:'Zachary',body:'#4E88E8',accent:'#E7D067'},
 {id:'character-mulan',name:'Mulan',body:'#B75ED8',accent:'#F4C9DD'},
 {id:'character-gaby',name:'Gaby',body:'#6ABC5B',accent:'#F0CB62'},
 {id:'character-sara',name:'Sara',body:'#E39A3B',accent:'#6A8FCB'},
 {id:'character-mum',name:'Mum',body:'#E76891',accent:'#F1D5B5'},
 {id:'character-dad',name:'Dad',body:'#697386',accent:'#A9C5A5'}
]);

export const MODES=Object.freeze([
 {id:'mode-one-v-one',name:'1 vs 1',kind:'OneVsOne'},
 {id:'mode-two-v-two',name:'2 vs 2',kind:'TwoVsTwo'},
 {id:'mode-free-for-all',name:'Free For All',kind:'FreeForAll'},
 {id:'mode-royal-rumble',name:'Royal Rumble',kind:'RoyalRumble'},
 {id:'mode-mango-grab',name:'Mango Grab',kind:'MangoGrab'},
 {id:'mode-hot-bomb',name:'Hot Bomb',kind:'HotBomb'},
 {id:'mode-king-of-ring',name:'King of the Ring',kind:'KingOfRing'},
 {id:'mode-heist',name:'Heist',kind:'Heist'}
]);

export const byId=(items,id)=>items.find(item=>item.id===id)||items[0];
