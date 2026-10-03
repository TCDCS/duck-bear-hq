/** Small integration boundary: existing accounts and permissions remain authoritative. */
import {authenticate} from '../hq/core.mjs';
import {initialise,pairOnly,requireOwner,permission} from '../hq/schema.mjs';
import {createBooksHandler} from './handler.mjs';
export function withBooks(fallback){return createBooksHandler(fallback,{
 authenticate,
 async requirePair(env,user){await pairOnly(env,user);await initialise(env,user);},
 requireOwner,
 async isOwner(env,user){return (await permission(env,user,'intimate')).owner;}
});}
