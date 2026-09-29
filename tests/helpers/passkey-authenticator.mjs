/** Real software authenticator for isolated cryptographic tests, never production. */
import {encodeCBOR} from '@levischuck/tiny-cbor';
const bytes=s=>new TextEncoder().encode(s),b64=b=>Buffer.from(b).toString('base64url');
const decode=s=>new Uint8Array(Buffer.from(s,'base64url'));
const digest=async b=>new Uint8Array(await crypto.subtle.digest('SHA-256',b));
const join=(...parts)=>new Uint8Array(Buffer.concat(parts.map(p=>Buffer.from(p))));
function der(raw){const ints=[raw.slice(0,32),raw.slice(32)].map(x=>{while(x.length>1&&x[0]===0)x=x.slice(1);if(x[0]&128)x=join([0],x);return join([2,x.length],x);});const both=join(...ints);return join([48,both.length],both);}
export async function authenticator(options,{origin='https://duck-bear.test',uv=true}={}){
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey),credential=crypto.getRandomValues(new Uint8Array(32));
 const cose=encodeCBOR(new Map([[1,2],[3,-7],[-1,1],[-2,decode(jwk.x)],[-3,decode(jwk.y)]]));
 const clientData=bytes(JSON.stringify({type:'webauthn.create',challenge:options.challenge,origin,crossOrigin:false}));
 const authData=join(await digest(bytes(options.rp.id)),[uv?69:65],[0,0,0,0],new Uint8Array(16),[0,credential.length],credential,cose);
 const registration={id:b64(credential),rawId:b64(credential),type:'public-key',clientExtensionResults:{},authenticatorAttachment:'platform',response:{clientDataJSON:b64(clientData),attestationObject:b64(encodeCBOR(new Map([['fmt','none'],['attStmt',new Map()],['authData',authData]]))),transports:['internal']}};
 return {registration,credentialId:b64(credential),async assertion(authOptions,{origin:assertionOrigin=origin,uv=true,counter=1,challenge=authOptions.challenge}={}){
  const client=bytes(JSON.stringify({type:'webauthn.get',challenge,origin:assertionOrigin,crossOrigin:false}));
  const count=new Uint8Array(4);new DataView(count.buffer).setUint32(0,counter);
  const data=join(await digest(bytes(authOptions.rpId)),[uv?5:1],count);
  const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,join(data,await digest(client))));
  return {id:b64(credential),rawId:b64(credential),type:'public-key',clientExtensionResults:{},response:{authenticatorData:b64(data),clientDataJSON:b64(client),signature:b64(der(sig)),userHandle:options.user.id}};
 }};
}
