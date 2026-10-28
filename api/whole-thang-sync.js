const COOKIE_NAME = "cbk_admin_session";
const EDGE = "https://waiopvueoobwrnlctmua.supabase.co/functions/v1/whole-thang-sync";
const HOSTS = new Set(["www.capturedbykam.com","capturedbykam.com","capturedbykam.vercel.app"]);
function cookies(input=""){
 const map={};
 for(const part of String(input).split(";")){
  const index=part.indexOf("=");
  if(index<0)continue;
  const key=part.slice(0,index).trim();
  try{map[key]=decodeURIComponent(part.slice(index+1).trim());}catch{}
 }
 return map;
}
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","private, no-store, max-age=0");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 const host=String(req.headers.host||"").toLowerCase();
 const origin=String(req.headers.origin||"");
 const referer=String(req.headers.referer||"");
 if(!HOSTS.has(host))return res.status(403).json({error:"Invalid host"});
 if(origin && origin!=="https://"+host)return res.status(403).json({error:"Invalid origin"});
 if(!origin && !referer.startsWith("https://"+host+"/"))return res.status(403).json({error:"Invalid request source"});
 const token=cookies(req.headers.cookie||"")[COOKIE_NAME]||"";
 if(!/^[a-f0-9]{64}$/i.test(token))return res.status(401).json({error:"Unlock admin first"});
 let body=req.body||{};
 if(typeof body==="string"){try{body=JSON.parse(body);}catch{return res.status(400).json({error:"Invalid JSON"});}}
 // Every weekly browser action must be forwarded to the authenticated Edge function.
// Previously only "load"/"save" were allowed, so Weeks 7-18 could never sync.
const actions=new Set(["load","save","loadWeek","saveWeek"]);
if(!body||typeof body!=="object"||Array.isArray(body)||!actions.has(body.action))
 return res.status(400).json({error:"Invalid sync action"});
if(body.action==="loadWeek"||body.action==="saveWeek"){
 if(body.season!==2026||!Number.isInteger(body.week)||body.week<7||body.week>18)
  return res.status(400).json({error:"Invalid NFL week"});
}
 try{
  const response=await fetch(EDGE,{method:"POST",headers:{"Content-Type":"application/json","Origin":"https://www.capturedbykam.com","x-cbk-admin-token":token},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>({error:"Sync service unavailable"}));
  return res.status(response.status).json(data);
 }catch{return res.status(502).json({error:"Sync service is temporarily unavailable"});}
};