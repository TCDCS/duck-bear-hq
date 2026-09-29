/** Transactional mail only. Credentials remain in Worker secrets, never browser responses. */
export const mailReady = env => Boolean(env.PASSWORD_RESET_FROM && (env.EMAIL?.send || env.RESEND_API_KEY));
export function mailStatus(env) {
  return {configured: mailReady(env), provider: env.EMAIL?.send ? 'Cloudflare' : env.RESEND_API_KEY ? 'Resend' : 'none',
    sender: String(env.PASSWORD_RESET_FROM || ''),
    message: mailReady(env) ? 'A sender is configured. A successful request is not proof of inbox delivery.' : 'Automatic email sending is not configured. No verification or reset email can be sent yet.'};
}
export async function sendMail(env, to, subject, text) {
  if (!mailReady(env)) return false;
  try {
    if (env.EMAIL?.send) { await env.EMAIL.send({to, from:String(env.PASSWORD_RESET_FROM), subject, text}); return true; }
    const r = await fetch('https://api.resend.com/emails', {method:'POST',
      headers:{authorization:'Bearer '+env.RESEND_API_KEY,'content-type':'application/json'},
      body:JSON.stringify({from:String(env.PASSWORD_RESET_FROM),to:[to],subject,text}),
      signal:AbortSignal.timeout(10000)});
    if (!r.ok) return false;
    const result=await r.json();return typeof result.id==='string' && result.id.length>0;
  } catch { return false; }
}
