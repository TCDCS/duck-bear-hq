const DUBLIN='Europe/Dublin';
export const SERVING_TIMES={breakfast:'06:45',lunch:'12:00',dinner:'18:00'};
const formatter=(timeZone,options)=>new Intl.DateTimeFormat('en-CA',{timeZone,...options});
export function mealStatus(date,course,now=new Date(),timeZone=DUBLIN){
  const day=formatter(timeZone,{year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  if(date<day)return 'served';
  if(date>day)return 'upcoming';
  const time=formatter(timeZone,{hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  return time>=(SERVING_TIMES[course]||'23:59')?'served':'upcoming';
}
export function applyMealStatuses(root=document,now=new Date()){
  for(const card of root.querySelectorAll('.day-card[data-date]')){
    const states=[];
    for(const meal of card.querySelectorAll('.meal[data-course]')){
      const state=mealStatus(card.dataset.date,meal.dataset.course,now);
      meal.dataset.status=state;states.push(state);
      const badge=meal.querySelector('[data-status]');
      if(badge){badge.textContent=state==='served'?'Served':'Upcoming';badge.classList.remove('served','upcoming');badge.classList.add(state);}
    }
    const dayState=states.length&&states.every(x=>x==='served')?'served':'upcoming';
    card.classList.remove('served','day-served','day-upcoming');
    card.classList.add(dayState==='served'?'day-served':'day-upcoming');
    const badge=card.querySelector('[data-day-status]');if(badge)badge.textContent=dayState==='served'?'Served':'Upcoming';
  }
}
if(typeof document!=='undefined'){applyMealStatuses(document);setInterval(()=>applyMealStatuses(document),30000);}
