export function titleOf(r){return r.data?.name||r.data?.title||r.data?.mealSnapshot?.title||r.data?.text?.slice(0,50)||r.kind;}
