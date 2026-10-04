
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'complaints.json');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon' };
const users = {
  'student@nitap.ac.in': { password:'student123', role:'student', name:'Prashant Kumar', initials:'PK' },
  'admin@nitap.ac.in': { password:'admin123', role:'admin', name:'Campus Administrator', initials:'CA' }
};
const sessions = new Map();

function seed(){
  const now=Date.now();
  return [
    {id:'CF-2481',title:'Lights not working in corridor',category:'Electrical',location:'Academic Block · 2nd floor',description:'The lights near room 204 have been out since yesterday evening. It gets quite dark after classes.',status:'In Progress',reporter:'Riya Kumar',initials:'RK',time:now-42*60000,icon:'☼',color:'electric',photo:'',mine:false},
    {id:'CF-2480',title:'Water cooler needs attention',category:'Water & Plumbing',location:'Hostel A · Ground floor',description:'The water cooler outside the common room is leaking and the water is not getting cold.',status:'Pending',reporter:'Priya Mehta',initials:'PM',time:now-2*3600000,icon:'♧',color:'water',photo:'',mine:false},
    {id:'CF-2479',title:'Wi-Fi keeps disconnecting',category:'Wi-Fi & Internet',location:'Central Library · Reading hall',description:'The campus Wi-Fi drops every few minutes in the main reading hall, especially in the back rows.',status:'Pending',reporter:'Prashant Kumar',initials:'PK',time:now-5*3600000,icon:'⌁',color:'wifi',photo:'',mine:true,reporterEmail:'student@nitap.ac.in'},
    {id:'CF-2478',title:'Projector not connecting',category:'Classroom',location:'Academic Block · Room 105',description:'The projector displays a blank screen even after reconnecting the HDMI cable. Class is scheduled here tomorrow.',status:'Resolved',reporter:'Nikhil Taba',initials:'NT',time:now-19*3600000,icon:'▣',color:'classroom',photo:'',mine:false},
    {id:'CF-2477',title:'Common room door latch broken',category:'Hostel',location:'Hostel B · Common room',description:'The latch on the common room door is loose and no longer closes properly.',status:'In Progress',reporter:'Prashant Kumar',initials:'PK',time:now-29*3600000,icon:'⌂',color:'hostel',photo:'',mine:true,reporterEmail:'student@nitap.ac.in'},
    {id:'CF-2476',title:'Overflowing bins near canteen',category:'Cleanliness',location:'Student Activity Centre · Canteen',description:'The waste bins near the canteen entrance have been full since lunch. Could someone arrange a pickup?',status:'Resolved',reporter:'Tashi Doma',initials:'TD',time:now-47*3600000,icon:'✿',color:'clean',photo:'',mine:false}
  ];
}
function readReports(){
  try { if(!fs.existsSync(DB_FILE)){fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(DB_FILE,JSON.stringify(seed(),null,2));} const rows=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));let changed=false;for(const row of rows)if(row.reporter==='Aditya Sharma'||row.reporterEmail==='student@nitap.ac.in'){if(row.reporter!=='Prashant Kumar'||row.initials!=='PK')changed=true;row.reporter='Prashant Kumar';row.initials='PK';}if(changed)fs.writeFileSync(DB_FILE,JSON.stringify(rows,null,2));return rows; }
  catch(error){console.error('Could not read complaint store:',error.message);return seed();}
}
function writeReports(rows){fs.mkdirSync(DATA_DIR,{recursive:true});fs.writeFileSync(DB_FILE,JSON.stringify(rows,null,2));}
let reports=readReports();
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(data));}
function getBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>4_000_000){reject(new Error('Request is too large'));req.destroy();}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);});}
function auth(req){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');return sessions.get(token);}
function fail(res,status,message){send(res,status,{error:message});}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS'});return res.end();}
  if(url.pathname.startsWith('/api/')){
    if(req.method==='POST'&&url.pathname==='/api/login'){
      try{const body=await getBody(req);const email=String(body.email||'').trim().toLowerCase();const user=users[email];if(!user||user.password!==body.password)return fail(res,401,'Email or password is incorrect.');const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{email,role:user.role,name:user.name,initials:user.initials});return send(res,200,{token,user:{email,role:user.role,name:user.name,initials:user.initials}});}catch(error){return fail(res,400,error.message);}
    }
    if(req.method==='POST'&&url.pathname==='/api/logout'){const user=auth(req);if(user){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');sessions.delete(token);}return send(res,200,{ok:true});}
    if(req.method==='GET'&&url.pathname==='/api/me'){const user=auth(req);return user?send(res,200,{user}):fail(res,401,'Please sign in again.');}
    if(req.method==='GET'&&url.pathname==='/api/complaints'){const user=auth(req);if(!user)return fail(res,401,'Please sign in.');const mine=url.searchParams.get('mine')==='true';const rows=user.role==='admin'&&!mine?reports:reports.filter(r=>r.reporterEmail===user.email);return send(res,200,{complaints:rows});}
    if(req.method==='POST'&&url.pathname==='/api/complaints'){
      const user=auth(req);if(!user)return fail(res,401,'Please sign in.');if(user.role!=='student')return fail(res,403,'Only students can submit reports.');
      try{const b=await getBody(req);for(const key of ['title','category','location','description'])if(!String(b[key]||'').trim())return fail(res,400,`${key} is required.`);if(b.title.length>80||b.location.length>90||b.description.length>500)return fail(res,400,'One or more fields are too long.');if(b.photo&&(!/^data:image\/(png|jpeg|webp);base64,/.test(b.photo)||b.photo.length>2_100_000))return fail(res,400,'Photo must be JPG, PNG or WebP and smaller than 1.5 MB.');const number=Math.max(2481,...reports.map(r=>Number(String(r.id).replace('CF-',''))||0))+1;const map={'Electrical':['☼','electric'],'Water & Plumbing':['♧','water'],'Wi-Fi & Internet':['⌁','wifi'],'Classroom':['▣','classroom'],'Hostel':['⌂','hostel'],'Cleanliness':['✿','clean']};const [icon,color]=map[b.category]||['◉','other'];const row={id:`CF-${number}`,title:b.title.trim(),category:b.category,location:b.location.trim(),description:b.description.trim(),status:'Pending',reporter:user.name,initials:user.initials,reporterEmail:user.email,time:Date.now(),icon,color,photo:b.photo||'',mine:true};reports.unshift(row);writeReports(reports);return send(res,201,{complaint:row});}catch(error){return fail(res,400,error.message);}
    }
    const statusMatch=url.pathname.match(/^\/api\/complaints\/(CF-\d+)\/status$/);
    if(req.method==='PATCH'&&statusMatch){const user=auth(req);if(!user)return fail(res,401,'Please sign in.');if(user.role!=='admin')return fail(res,403,'Only administrators can manage complaints.');try{const b=await getBody(req);if(b.status&&!['Pending','In Progress','Resolved'].includes(b.status))return fail(res,400,'Invalid status.');if(b.priority&&!['High','Medium','Low'].includes(b.priority))return fail(res,400,'Invalid priority.');if(typeof b.adminNote==='string'&&b.adminNote.length>500)return fail(res,400,'The student update must be 500 characters or fewer.');if(!b.status&&!b.priority&&typeof b.adminNote!=='string')return fail(res,400,'No complaint changes were provided.');const row=reports.find(r=>r.id===statusMatch[1]);if(!row)return fail(res,404,'Complaint not found.');if(b.status)row.status=b.status;if(b.priority)row.priority=b.priority;if(typeof b.adminNote==='string')row.adminNote=b.adminNote.trim();writeReports(reports);return send(res,200,{complaint:row});}catch(error){return fail(res,400,error.message);}}
    return fail(res,404,'API route not found.');
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Method not allowed');}
  let pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);let file=path.resolve(ROOT,'.'+pathname);if(!file.startsWith(ROOT+path.sep)&&file!==ROOT)return fail(res,403,'Forbidden.');
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found');}res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();res.end(data);});
});
server.listen(PORT,()=>console.log(`CampusFix frontend and API running at http://localhost:${PORT}`));
