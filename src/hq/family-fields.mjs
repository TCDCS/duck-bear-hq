/** Validation shared by family history records. No personal seed data belongs here. */
import {fail,text,choice,ref,url,date} from './core.mjs';
export const FAMILY_KINDS=['person','relationship','story','lifeEvent','familyPlace','familySource','familyResearch','familyPrivate'];
export const EVIDENCE=['family','document','index','reported','unresolved','excluded'];
export const EVENT_TYPES=['birth','death','career','marriage','separation','divorce','adoption','registration','migration','residence','funeral','achievement','pet-arrival','name-change','other'];
export const RELATION_TYPES=['parent','adoptive-parent','step-parent','guardian','partner','former-partner','sibling','half-sibling','adoptive-sibling','cousin','pet','witness','other'];
export function partialDate(value){
 const s=text(value,10);if(!s)return '';
 if(/^\d{4}$/.test(s)&&Number(s)>0)return s;
 if(/^\d{4}-\d{2}$/.test(s)&&Number(s.slice(0,4))>0&&Number(s.slice(5))>=1&&Number(s.slice(5))<=12)return s;
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return date(s);
 fail(400,'Use a date as YYYY, YYYY-MM or YYYY-MM-DD. Put uncertain dates in the date note.');
}
export function refs(value){if(value===undefined||value===null||value==='')return [];if(typeof value==='string')value=value.split('\n').map(s=>s.trim()).filter(Boolean);if(!Array.isArray(value)||value.length>30)fail(400,'Choose no more than 30 linked records.');return [...new Set(value.map(v=>ref(v,{required:true})))];}
export function aliases(value){if(value===undefined)return [];if(typeof value==='string')value=value.split('\n');if(!Array.isArray(value)||value.length>20)fail(400,'Use no more than 20 alternate names.');return [...new Set(value.map(v=>text(v,160)).filter(Boolean))];}
export function provenance(input){return {evidence:choice(input.evidence,EVIDENCE,'unresolved'),sourceIds:refs(input.sourceIds),sourceNotes:text(input.sourceNotes,4000),sourceKey:ref(input.sourceKey)};}
export function period(input){const start=partialDate(input.start),end=partialDate(input.end);if(start&&end&&end.padEnd(10,'9')<start.padEnd(10,'0'))fail(400,'The end date cannot be before the start date.');return {start,end,dateNote:text(input.dateNote,500)};}
export function coordinates(input){const coordinate=(v,max,label)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>max)fail(400,`Invalid ${label} coordinate.`);return n;};const latitude=coordinate(input.latitude,90,'latitude'),longitude=coordinate(input.longitude,180,'longitude');if((latitude===null)!==(longitude===null))fail(400,'Enter both coordinates together, or leave both blank.');return {latitude,longitude};}
export function personFields(input){return {entityType:choice(input.entityType,['person','pet','associate'],'person'),aliases:aliases(input.aliases),isRoot:input.isRoot===true,livingStatus:choice(input.livingStatus,['living','deceased','unknown'],'unknown'),currentPlace:text(input.currentPlace,200),currentPlaceId:ref(input.currentPlaceId),birthPlaceId:ref(input.birthPlaceId),deathPlace:text(input.deathPlace,200),deathPlaceId:ref(input.deathPlaceId),avatarId:ref(input.avatarId),avatarX:crop(input.avatarX),avatarY:crop(input.avatarY),birthNote:text(input.birthNote,1000),deathNote:text(input.deathNote,1000),ancestryNotes:text(input.ancestryNotes,4000),nameOriginal:text(input.nameOriginal,200),nameOrigin:text(input.nameOrigin,300),nameMeaning:text(input.nameMeaning,3000),nameMeaningSources:text(input.nameMeaningSources,4000),nameStory:text(input.nameStory,3000),storybookText:text(input.storybookText,6000),storyMapPlace:text(input.storyMapPlace,200),storyMapNote:text(input.storyMapNote,1000),...provenance(input)};}
function crop(v){const n=Number(v??50);if(!Number.isFinite(n)||n<0||n>100)fail(400,'Portrait crop must be between 0 and 100.');return n;}
export function familyData(kind,input){
 switch(kind){
 case 'lifeEvent':return {personId:ref(input.personId,{required:true}),participants:refs(input.participants),title:text(input.title,200,{required:true}),eventType:choice(input.eventType,EVENT_TYPES,'other'),...period(input),placeId:ref(input.placeId),details:text(input.details,10000),...provenance(input)};
 case 'familyPlace':return {title:text(input.title,200,{required:true}),locality:text(input.locality,200),country:text(input.country,100),precision:choice(input.precision,['town','venue','region','country','unmapped'],'unmapped'),mapQuery:text(input.mapQuery,400),...coordinates(input),notes:text(input.notes,5000),...provenance(input)};
 case 'familySource':return {title:text(input.title,200,{required:true}),sourceType:choice(input.sourceType,['family','certificate','index','memorial','professional','news','tree','other'],'other'),url:url(input.url),reference:text(input.reference,500),checkedOn:date(input.checkedOn),summary:text(input.summary,10000),...provenance(input)};
 case 'familyResearch':return {title:text(input.title,200,{required:true}),personId:ref(input.personId),status:choice(input.status,['open','in-progress','resolved','excluded'],'open'),details:text(input.details,10000),...provenance(input)};
 case 'familyPrivate':return {title:text(input.title||'Household-only details',200),personId:ref(input.personId,{required:true}),birth:text(input.birth,200),address:text(input.address,500),historicalAddresses:text(input.historicalAddresses,5000),religion:text(input.religion,200),religionContext:choice(input.religionContext,['personal','family-background','not-recorded'],'not-recorded'),religionNotes:text(input.religionNotes,2000),allergies:allergyList(input.allergies),allergyNotes:text(input.allergyNotes,2000),propertyNotes:text(input.propertyNotes,3000),notes:text(input.notes,10000),asOf:date(input.asOf),...provenance(input)};
 default:fail(400,'Unknown family history record.');
 }
}

function allergyList(value){if(value===undefined||value===null||value==='')return [];if(typeof value==='string')value=value.split('\n');if(!Array.isArray(value)||value.length>30)fail(400,'Use no more than 30 allergy entries.');return [...new Set(value.map(v=>text(v,200)).filter(Boolean))];}
