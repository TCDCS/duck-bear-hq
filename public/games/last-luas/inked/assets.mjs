export const ASSET_SET='inked-20260919-a';
export const BRAND_FILES=[
 ['hodges','png','5b731c8a0ff900c11ee8b16278f1350756a5835604a685c94cae3dabf4d607cb'],
 ['cafe','svg','0db7f71057e5cd77f90defc10872c4de39053fb71b66840952ea6ad012418727'],
 ['ivy','svg','63a6a18f0b279ce1231042a3b1bc2e031dd2b0c4229eba66db866db400e064d2'],
 ['pret','png','b3416a14ea5fb3184f0ec8cb08efe878f81a1db52aa9b38f477e2911108ccbf0']
];
export async function loadBrands(signal){
 const pairs=await Promise.all(BRAND_FILES.map(async([id,ext,hash])=>{
  const response=await fetch(`./private/brands/${id}.${ext}?set=${ASSET_SET}`,{credentials:'same-origin',cache:'no-store',signal});
  if(response.status===401||response.status===403)throw Error('Your private game session has ended. Sign in again from Games.');
  if(!response.ok)throw Error(`The ${id} logo did not load (${response.status}). Reload to try again.`);
  const mime=ext==='svg'?'image/svg+xml':'image/png';if(!response.headers.get('content-type')?.startsWith(mime))throw Error('An artwork request returned the wrong file type.');
  const bytes=await response.arrayBuffer();if(bytes.byteLength>2000000)throw Error('Artwork exceeds its expected size.');
  const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==hash)throw Error(`The ${id} artwork version does not match this build.`);
  const url=URL.createObjectURL(new Blob([bytes],{type:mime}));const img=new Image();img.src=url;
  try{await img.decode();}catch{throw Error(`Cannot read the ${id} artwork.`);}finally{URL.revokeObjectURL(url);}
  return [id,img];
 }));
 return Object.fromEntries(pairs);
}
