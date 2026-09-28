export const navigation=[
 {label:'Our Space',icon:'⌂',base:'/our-space/',section:'home',links:[['Today','/our-space/'],['This week','/our-space/this-week/'],['Activity','/our-space/activity/'],['Notifications','/our-space/notifications/'],['Favourites','/our-space/favourites/'],['Little notes','/our-space/notes/']]},
 {label:'Menus',icon:'♨',base:'/menus/',section:'menus',links:[['Current menu','/menus/current/'],['Weekly planner','/menus/planner/'],['Meal ideas','/menus/ideas/'],['Recipes','/menus/recipes/'],['Reviews','/menus/reviews/'],['Shopping lists','/menus/shopping/'],['Archive','/menus/archive/']]},
 {label:'Family Tree',icon:'♧',base:'/family-tree/',section:'family',links:[['Tree view','/family-tree/'],['People','/family-tree/people/'],['Timeline','/family-tree/timeline/'],['Stories','/family-tree/stories/'],['Suggested changes','/family-tree/suggestions/'],['Access','/family-tree/access/']]},
 {label:'Scrapbook',icon:'♡',base:'/scrapbook/',section:'scrapbook',links:[['Albums','/scrapbook/albums/'],['All memories','/scrapbook/memories/'],['Calendar view','/scrapbook/calendar/'],['Favourites','/scrapbook/favourites/'],['Drafts','/scrapbook/drafts/']]},
 {label:'Plans & Adventures',icon:'✈',base:'/plans/',section:'plans',links:[['Calendar','/plans/calendar/'],['Ideas','/plans/ideas/'],['Decision board','/plans/polls/'],['Bucket list','/plans/bucket-list/'],['Completed','/plans/completed/'],['Surprise me','/plans/surprise/']]},
 {label:'Games',icon:'✦',base:'/games/',section:'public',links:[['All games','/games/'],['Favourites','/games/favourites/'],['Play together','/games/together/'],['Updates','/games/updates/']]},
 {label:'Shop & Points',icon:'☆',base:'/shop/',section:'core',links:[['Gift shop','/shop/'],['Basket','/basket/'],['Orders','/orders/'],['Points history','/points/history/'],['Rewards','/rewards/']]},
 {label:'Image Library',icon:'▧',base:'/image-library/',section:'images',links:[['All uploads','/image-library/'],['Section covers','/image-library/covers/'],['Profile pictures','/image-library/profiles/'],['Import supplied images','/image-library/import/']]},
 {label:'Settings',icon:'⚙',base:'/settings/',section:'account',links:[['Profile','/settings/profile/'],['Email','/settings/email/'],['Password & security','/settings/security/'],['Devices','/settings/devices/'],['Notifications','/settings/notifications/'],['Appearance','/settings/appearance/'],['Language','/settings/language/'],['Images','/settings/images/'],['My data','/settings/data/']]},
 {label:'Admin',icon:'⌘',base:'/admin/',section:'owner',links:[['Users','/admin/users/'],['Invitations','/admin/invitations/'],['Permissions','/admin/permissions/'],['Site appearance','/admin/appearance/'],['Backups','/admin/backups/'],['Recycle bin','/admin/recycle-bin/'],['Change history','/admin/history/']]},
];
export const kinds={person:{section:'family',path:'/family-tree/people/',label:'Person'},relation:{section:'family',path:'/family-tree/relationships/',label:'Relationship'},proposal:{section:'family',path:'/family-tree/suggestions/',label:'Suggested change'},album:{section:'scrapbook',path:'/scrapbook/albums/',label:'Album'},memory:{section:'scrapbook',path:'/scrapbook/memories/',label:'Memory'},recipe:{section:'menus',path:'/menus/recipes/',label:'Recipe'},idea:{section:'menus',path:'/menus/ideas/',label:'Meal idea'},week:{section:'menus',path:'/menus/planner/',label:'Menu week'},meal:{section:'menus',path:'/menus/meals/',label:'Meal'},review:{section:'menus',path:'/menus/reviews/',label:'Meal review'},shopping:{section:'menus',path:'/menus/shopping/',label:'Shopping list'},adventure:{section:'plans',path:'/plans/adventures/',label:'Adventure'},poll:{section:'plans',path:'/plans/polls/',label:'Poll'},note:{section:'notes',path:'/our-space/notes/',label:'Note'},media:{section:'images',path:'/image-library/',label:'Image'}};
export function itemPath(r){if(r.section==='family'&&r.kind==='memory')return '/family-tree/stories/'+r.id+'/';return (kinds[r.kind]?.path||'/our-space/')+encodeURIComponent(r.id)+'/';}
export function resolve(path){
 path='/'+path.split('/').filter(Boolean).join('/')+'/';if(path==='//')path='/';
 if(path==='/our-space/search/')return {group:'home',view:path};
 if(path==='/')return {group:'public',view:'home',public:true};
 if(/^\/menus\/archive\/\d{4}-\d{2}-\d{2}\/$/.test(path))return null;
 if(/^\/account\/(recover|reset|invite|verify)\/$/.test(path)||path==='/account/')return {group:'account',view:path.split('/')[2]||'login',public:true};
 if(/^\/games\//.test(path)&&!['/games/','/games/favourites/','/games/together/','/games/updates/'].includes(path))return null;
 const group=navigation.find(g=>path===g.base||path.startsWith(g.base));
 if(group){const known=new Set([group.base,...group.links.map(x=>x[1])]);if(known.has(path))return {group:group.section,view:path,label:group.links.find(x=>x[1]===path)?.[0]||group.label,public:group.section==='public'||['/menus/','/menus/current/','/menus/archive/'].includes(path)};
  if(/^\/menus\/weeks\/\d{4}-\d{2}-\d{2}\/$/.test(path))return {group:'menus',view:'published',date:path.split('/')[3],public:true};
  if(/^\/shop\/products\/[^/]+\/$/.test(path))return {group:'core',view:path};
  if(/^\/admin\/users\/[^/]+\/(?:permissions\/|security\/|edit\/)?$/.test(path))return {group:'owner',view:'user',id:path.split('/')[3],tab:path.split('/')[4]||'overview'};
  const all=Object.entries(kinds).sort((a,b)=>b[1].path.length-a[1].path.length);for(const [kind,k] of all)if(path.startsWith(k.path)){const rest=path.slice(k.path.length).split('/').filter(Boolean);if(rest.length>=1&&rest.length<=2&&(!rest[1]||['edit','history','photos','stories','relationships','settings','preview'].includes(rest[1])))return {group:k.section,view:'record',kind,id:rest[0],tab:rest[1]||'overview'};}
  if(path.startsWith('/family-tree/stories/')){const parts=path.split('/');return {group:'family',view:'record',kind:'memory',id:parts[3],tab:parts[4]||'overview'};}
  if(path==='/family-tree/relationships/new/')return {group:'family',view:'record',kind:'relation',id:'new',tab:'edit'};
 }
 if(path==='/basket/'||path.startsWith('/orders/')||path.startsWith('/points/')||path==='/rewards/')return {group:'core',view:path};
 return null;
}
export function breadcrumbs(path){const route=resolve(path);if(!route)return [['Home','/']];const g=navigation.find(g=>g.section===route.group&&path.startsWith(g.base));const out=[['Home','/']];if(g)out.push([g.label,g.base]);if(route.kind)out.push([kinds[route.kind].label+'s',kinds[route.kind].path]);return out.filter((x,i,a)=>a.findIndex(y=>x[1]===y[1])===i);}
