export const NAV=[
 {title:'Our Space',icon:'⌂',base:'/our-space/',section:null,items:[['Today','/our-space/'],['This week','/our-space/this-week/'],['Recent activity','/our-space/activity/'],['Notifications','/our-space/notifications/'],['Favourites','/our-space/favourites/'],['Little notes','/our-space/notes/']]},
 {title:'Menus',icon:'🍋',base:'/menus/planner/',section:'menus',items:[['Current menu','/menus/'],['Weekly planner','/menus/planner/'],['Meal ideas','/menus/ideas/'],['Recipes','/menus/recipes/'],['Shopping list','/menus/shopping/'],['Reviews','/menus/reviews/','intimate'],['Archive','/menus/archive/']]},
 {title:'Family Tree',icon:'🌿',base:'/family-tree/',section:'family',items:[['Overview','/family-tree/'],['Tree view','/family-tree/tree/'],['People','/family-tree/people/'],['Timeline','/family-tree/timeline/'],['Life events','/family-tree/events/'],['World map','/family-tree/map/'],['Places','/family-tree/places/'],['Sources','/family-tree/sources/'],['Research questions','/family-tree/research/'],['Stories','/family-tree/stories/'],['Suggested changes','/family-tree/changes/'],['Recycle bin','/family-tree/recycle/'],['Access','/family-tree/access/']]},
 {title:'Scrapbook',icon:'♡',base:'/scrapbook/',section:'scrapbook',items:[['Albums','/scrapbook/'],['All memories','/scrapbook/memories/'],['Calendar','/scrapbook/calendar/'],['Favourites','/scrapbook/favourites/'],['Drafts','/scrapbook/drafts/'],['Recycle bin','/scrapbook/recycle/']]},
 {title:'Plans & Adventures',icon:'☀',base:'/plans/',section:'plans',items:[['Our plans','/plans/'],['Trips','/plans/trips/'],['Calendar','/plans/calendar/'],['Ideas','/plans/ideas/'],['Polls','/plans/polls/'],['Bucket list','/plans/bucket-list/'],['Completed','/plans/completed/'],['Surprise me','/plans/surprise/']]},
 {title:'Image Library',icon:'▧',base:'/image-library/',section:null,items:[['All images','/image-library/'],['Upload','/image-library/upload/'],['Recycle bin','/image-library/recycle/']]},
 {title:'Shop & Points',icon:'🎁',base:'/shop/',pair:true,items:[['Gift shop','/shop/'],['Basket','/shop/basket/'],['Orders','/orders/'],['Yaya Points','/points/'],['Rewards','/points/rewards/']]},
 {title:'Info Library',icon:'📚',base:'/info/',section:'library',items:[['All pages','/info/'],['Hand wash & allergies','/info/allergies/'],['About Duck & Bear','/about/']]},
 {title:'Adults Only',icon:'⛓',base:'/adults-only/',section:null,items:[['Adults Only','/adults-only/'],['Outfits','/adults-only/outfits/']]},
 {title:'Settings',icon:'⚙',base:'/settings/',section:null,items:[['All settings','/settings/'],['Profile','/settings/profile/'],['Email','/settings/email/'],['Security','/settings/security/'],['Passkeys','/settings/passkeys/'],['Devices','/settings/devices/'],['Notifications','/settings/notifications/'],['Appearance','/settings/appearance/'],['Language','/settings/language/'],['Images & covers','/settings/images/'],['My data','/settings/data/'],['Updates','/settings/updates/']]},
 {title:'Admin',icon:'✦',base:'/admin/',owner:true,items:[['Overview','/admin/'],['Users','/admin/users/'],['Invitations','/admin/invitations/'],['Permissions','/admin/permissions/'],['Site appearance','/admin/appearance/'],['Recovery requests','/admin/recovery/'],['Email delivery','/admin/email/'],['Backups & restore','/admin/backups/'],['Change history','/admin/history/']]}
];
export const COLLECTIONS={
 '/info/pages/':{kind:'info',section:'library',title:'Info Library',singular:'page'},
 '/family-tree/events/':{kind:'lifeEvent',section:'family',title:'Life events',singular:'life event'},
 '/family-tree/places/':{kind:'familyPlace',section:'family',title:'Places',singular:'place'},
 '/family-tree/sources/':{kind:'familySource',section:'family',title:'Sources',singular:'source'},
 '/family-tree/research/':{kind:'familyResearch',section:'family',title:'Research questions',singular:'research question'},
 '/family-tree/private/':{kind:'familyPrivate',section:'intimate',title:'Household-only family details',singular:'household record'},
 '/family-tree/people/':{kind:'person',section:'family',title:'People',singular:'person'},
 '/family-tree/relationships/':{kind:'relationship',section:'family',title:'Relationships',singular:'relationship'},
 '/family-tree/stories/':{kind:'story',section:'family',title:'Family stories',singular:'story'},
 '/family-tree/changes/':{kind:'change',section:'family',title:'Suggested changes',singular:'suggestion'},
 '/scrapbook/albums/':{kind:'album',section:'scrapbook',title:'Our albums',singular:'album'},
 '/scrapbook/memories/':{kind:'memory',section:'scrapbook',title:'All memories',singular:'memory'},
 '/menus/ideas/':{kind:'idea',section:'menus',title:'Meal ideas',singular:'idea'},
 '/menus/recipes/':{kind:'recipe',section:'menus',title:'Recipe book',singular:'recipe'},
 '/menus/planner/':{kind:'week',section:'menus',title:'Weekly planner',singular:'week'},
 '/menus/meals/':{kind:'serving',section:'menus',title:'Meals',singular:'meal'},
 '/menus/shopping/':{kind:'shopping',section:'menus',title:'Shopping list',singular:'shopping item'},
 '/menus/reviews/':{kind:'review',section:'intimate',title:'The review book',singular:'review'},
 '/plans/adventures/':{kind:'plan',section:'plans',title:'Our plans',singular:'plan'},
 '/plans/ideas/':{kind:'planIdea',section:'plans',title:'Adventure ideas',singular:'idea'},
 '/plans/polls/':{kind:'poll',section:'plans',title:'The decision board',singular:'poll'},
 '/plans/bucket-list/':{kind:'bucket',section:'plans',title:'Our bucket list',singular:'bucket-list entry'},
 '/our-space/notes/':{kind:'note',section:'intimate',title:'Little notes',singular:'note'}
};
export const KIND_PATH=Object.fromEntries(Object.entries(COLLECTIONS).map(([p,c])=>[c.kind,p]));
export const recordLink=r=>(KIND_PATH[r.kind]||'/our-space/')+r.id+'/';
export const normalize=p=>p==='/'?p:p.replace(/\/+$/,'')+'/';
const aliases={'/hub/':'/our-space/','/hub/index.html/':'/our-space/','/info/index.html/':'/info/','/about/index.html/':'/about/','/info/allergies/':'/info/pages/info-allergies/','/account/':'/our-space/','/account.html/':'/our-space/','/menus/member/':'/menus/planner/','/menus/weeks/':'/menus/planner/'};
const legacyHashes={home:'/our-space/',shop:'/shop/',loyalty:'/points/',orders:'/orders/',fun:'/plans/',admin:'/admin/',family:'/family-tree/',scrapbook:'/scrapbook/',menus:'/menus/planner/',apps:'/games/',settings:'/settings/',users:'/admin/users/',permissions:'/admin/permissions/','menus/library':'/menus/ideas/','menus/week':'/menus/planner/','menus/history':'/menus/planner/','scrapbook/timeline':'/scrapbook/memories/','scrapbook/add':'/scrapbook/memories/new/','family/tree':'/family-tree/tree/','family/people':'/family-tree/people/','family/relationships':'/family-tree/relationships/','settings/profile':'/settings/profile/','settings/security':'/settings/security/','settings/appearance':'/settings/appearance/','settings/privacy':'/settings/data/','admin/users':'/admin/users/','admin/permissions':'/admin/permissions/'};
export function resolveRoute(raw,hash=''){const path=normalize(raw);if(aliases[path]){const oldAccount=['/hub/','/hub/index.html/','/account/','/account.html/'].includes(path);return {view:'redirect',path:oldAccount?(legacyHashes[hash.replace(/^#\/?/,'')]||aliases[path]):aliases[path]};}
 if(path==='/info/')return {view:'collection',...COLLECTIONS['/info/pages/'],base:'/info/pages/'};
 if(path==='/about/')return {view:'about'};
 if(path==='/adults-only/')return {view:'adults',tab:'index'};
 if(path==='/adults-only/outfits/')return {view:'adults',tab:'outfits'};
 if(['/sign-in/','/reset-password/','/verify-email/','/accept-invitation/'].includes(path))return {view:'auth',mode:path.split('/')[1]};
 if(['/family-tree/','/family-tree/tree/','/family-tree/timeline/','/family-tree/access/','/family-tree/map/','/family-tree/import/','/family-tree/recycle/','/family-tree/people/'].includes(path))return {view:'family',section:'family',tab:path.split('/')[2]||'overview'};
 if(path==='/scrapbook/')return {view:'collection',...COLLECTIONS['/scrapbook/albums/'],base:'/scrapbook/albums/'};
 if(['/scrapbook/calendar/','/scrapbook/favourites/','/scrapbook/drafts/','/scrapbook/recycle/'].includes(path))return {view:'scrapbook',section:'scrapbook',tab:path.split('/')[2]};
 if(path==='/plans/')return {view:'collection',...COLLECTIONS['/plans/adventures/'],base:'/plans/adventures/'};
 if(path==='/plans/trips/'||path==='/plans/prague/'||path==='/plans/france-belgium/')return {view:'trips',section:'plans',tab:path==='/plans/prague/'?'prague':path==='/plans/france-belgium/'?'france-belgium':'index'};
 if(['/plans/calendar/','/plans/completed/','/plans/surprise/'].includes(path))return {view:'plans',section:'plans',tab:path.split('/')[2]};
 if(['/our-space/','/our-space/this-week/','/our-space/activity/','/our-space/notifications/','/our-space/favourites/'].includes(path))return {view:'home',tab:path.split('/')[2]||'today'};
 if(['/image-library/','/image-library/upload/','/image-library/recycle/'].includes(path))return {view:'images',tab:path.split('/')[2]||'all'};
 const image=path.match(/^\/image-library\/([\w-]+)\/$/);if(image)return {view:'image',id:image[1]};
 if(path==='/settings/')return {view:'setting',tab:'index'};
 if(/^\/settings\/(profile|email|security|passkeys|devices|notifications|appearance|language|images|data|updates)\/$/.test(path))return {view:'setting',tab:path.split('/')[2]};
 if(path==='/admin/')return {view:'admin',tab:'index',owner:true};
 if(/^\/admin\/(users|invitations|permissions|appearance|recovery|backups|history)\/$/.test(path))return {view:'admin',tab:path.split('/')[2],owner:true};
 if(path==='/admin/email/')return {view:'admin',tab:'email-delivery',owner:true};
 if(path==='/admin/users/create/')return {view:'admin',tab:'user-create',owner:true};
 const accountTab=path.match(/^\/admin\/users\/([\w-]+)\/(email|security|settings)\/$/);if(accountTab)return {view:'admin',tab:'user-'+accountTab[2],id:accountTab[1],owner:true};
 if(path==='/admin/users/new/')return {view:'admin',tab:'user-new',owner:true};
 const user=path.match(/^\/admin\/users\/([\w-]+)\/(permissions\/)?$/);if(user)return {view:'admin',tab:user[2]?'user-permissions':'user',id:user[1],owner:true};
 if(['/shop/','/shop/basket/','/orders/','/points/','/points/rewards/'].includes(path))return {view:'shop',tab:path.slice(1,-1),pair:true};
 const product=path.match(/^\/shop\/products\/([\w-]+)\/$/);if(product)return {view:'shop',tab:'product',id:product[1],pair:true};
 const order=path.match(/^\/orders\/([\w-]+)\/$/);if(order)return {view:'shop',tab:'order',id:order[1],pair:true};
 for(const [base,c] of Object.entries(COLLECTIONS)){
  if(path===base)return {view:'collection',base,...c};
  if(path===base+'new/')return {view:'form',base,...c};
  if(path.startsWith(base)){const rest=path.slice(base.length).split('/').filter(Boolean);if(/^[\w-]+$/.test(rest[0]||'')&&rest.length<=2&&(!rest[1]||['edit','photos','comments','history','relationships','stories','timeline','sources','private','pages','recipe','reviews','shopping','access'].includes(rest[1])))return {view:rest[1]==='edit'?'form':'record',base,...c,id:rest[0],tab:rest[1]||'overview'};}
 }
 return {view:'notFound'};
}
export function groupFor(path){return NAV.find(g=>g.items.some(([,p])=>p===path))||NAV.find(g=>path.startsWith(g.base.split('/').slice(0,2).join('/')+'/'));}
