/** Load only the selected feature; browser import caching deduplicates downloads. */
export const recordForm = async (...args)=>{if(args[1]?.section==='family'||args[1]?.kind==='familyPrivate')(await import('./family.mjs?v=family-books-1')).familyStyle();return (await import('./forms.mjs')).recordForm(...args);};
export const collectionView = async (...args)=>{if(args[1]?.section==='family')(await import('./family.mjs?v=family-books-1')).familyStyle();return (await import('./views.mjs')).collectionView(...args);};
export const recordView = async (...args)=>['person','relationship','story','lifeEvent','familyPlace','familySource','familyResearch','familyPrivate'].includes(args[1]?.kind)?(await import('./family.mjs?v=family-books-1')).familyRecordView(...args):(await import('./views.mjs')).recordView(...args);
export const familyView = async (...args)=>(await import('./family.mjs?v=family-books-1')).familyView(...args);
export const scrapbookView = async (...args)=>(await import('./views.mjs')).scrapbookView(...args);
export const plansView = async (...args)=>(await import('./views.mjs')).plansView(...args);
export const homeView = async (...args)=>(await import('./views.mjs')).homeView(...args);
export const tripsView = async (...args)=>(await import(args[1]?.tab==='prague'?'./prague-weekend.mjs':'./trips.mjs')).tripsView(...args);
export const settingsView = async (...args)=>(await import('./settings.mjs')).settingsView(...args);
export const adminView = async (...args)=>(await import('./settings.mjs')).adminView(...args);
export const accessView = async (...args)=>(await import('./settings.mjs')).accessView(...args);
export const imagesView = async (...args)=>(await import('./images.mjs')).imagesView(...args);
export const imageView = async (...args)=>(await import('./images.mjs')).imageView(...args);
export const shopView = async (...args)=>(await import('./shop.mjs')).shopView(...args);
export const adultsView = async (...args)=>(await import('./adults.mjs')).adultsView(...args);
