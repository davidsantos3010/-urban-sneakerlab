const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto"),url=require("url");
const PORT=process.env.PORT||3000,ROOT=__dirname,DB=path.join(ROOT,"data.json");
const seed={products:[
{id:"p1",brand:"Nike",name:"Air Force 1 ’07",slug:"air-force-1-07",price:119.99,stock:18,sizes:["38","39","40","41","42","43","44"],color:"White",active:true},
{id:"p2",brand:"Jordan",name:"Air Jordan 1 Retro High OG",slug:"air-jordan-1-retro-high-og",price:189.99,stock:7,sizes:["39","40","41","42","43","44"],color:"Chicago",active:true},
{id:"p3",brand:"adidas",name:"Campus 00s",slug:"campus-00s",price:109.99,stock:14,sizes:["38","39","40","41","42","43"],color:"Core Black",active:true},
{id:"p4",brand:"New Balance",name:"550",slug:"new-balance-550",price:129.99,stock:4,sizes:["39","40","41","42","43","44","45"],color:"White/Grey",active:true},
{id:"p5",brand:"Puma",name:"Suede XL",slug:"puma-suede-xl",price:99.99,stock:21,sizes:["38","39","40","41","42","43"],color:"Green/White",active:true}],users:[],orders:[]};
function load(){if(!fs.existsSync(DB))fs.writeFileSync(DB,JSON.stringify(seed,null,2));return JSON.parse(fs.readFileSync(DB,"utf8"))}
function save(x){fs.writeFileSync(DB,JSON.stringify(x,null,2))}
function out(res,s,d){res.writeHead(s,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,POST,PATCH,OPTIONS"});res.end(JSON.stringify(d))}
function body(req){return new Promise((ok,no)=>{let b="";req.on("data",c=>b+=c);req.on("end",()=>{try{ok(b?JSON.parse(b):{})}catch(e){no(e)}})})}
function uid(){return crypto.randomUUID()}
function stripeClient(){
  const key=process.env.STRIPE_SECRET_KEY;
  if(!key) return null;
  try{ const Stripe=require('stripe'); return new Stripe(key); }catch(e){ console.error('Stripe package/key:',e.message); return null; }
}

function file(res,n,t){fs.readFile(path.join(ROOT,n),(e,d)=>{if(e){res.writeHead(404);return res.end("Not found")}res.writeHead(200,{"Content-Type":t});res.end(d)})}
http.createServer(async(req,res)=>{
if(req.method==="OPTIONS")return out(res,204,{});
const u=url.parse(req.url,true),p=u.pathname,db=load();
try{
if(p==="/"||p==="/index.html")return file(res,"index.html","text/html; charset=utf-8");
if(p==="/admin.html")return file(res,"admin.html","text/html; charset=utf-8");
if(p==="/hero-concept.png")return file(res,"hero-concept.png","image/png");
if(p==="/api/health")return out(res,200,{ok:true});
if(p==="/api/products"&&req.method==="GET"){let a=db.products.filter(x=>x.active),q=(u.query.q||"").toLowerCase(),b=(u.query.brand||"").toLowerCase();if(q)a=a.filter(x=>(x.name+" "+x.brand+" "+x.color).toLowerCase().includes(q));if(b)a=a.filter(x=>x.brand.toLowerCase()===b);return out(res,200,{products:a})}
if(p.startsWith("/api/products/")&&req.method==="GET"){let x=db.products.find(x=>x.slug===p.split("/").pop());return x?out(res,200,{product:x}):out(res,404,{error:"Produto não encontrado"})}
if(p==="/api/auth/signup"&&req.method==="POST"){let b=await body(req);if(!b.name||!b.email)return out(res,400,{error:"Nome e email são obrigatórios"});if(db.users.some(x=>x.email===b.email))return out(res,409,{error:"Email já registado"});let user={id:uid(),name:b.name,email:b.email};db.users.push(user);save(db);return out(res,201,{user,token:"demo-"+user.id})}
if(p==="/api/stripe/checkout"&&req.method==="POST"){
  const stripe=stripeClient();
  if(!stripe) return out(res,503,{error:"Stripe Sandbox ainda não está configurado no servidor."});
  const b=await body(req);
  if(!Array.isArray(b.items)||!b.items.length) return out(res,400,{error:"Carrinho vazio."});
  const items=b.items.map(i=>({id:String(i.id),name:String(i.name||''),brand:String(i.brand||''),price:Number(i.price),size:String(i.size||''),quantity:Math.max(1,Number(i.quantity||1))}));
  if(items.some(i=>!i.id||!Number.isFinite(i.price)||i.price<=0)) return out(res,400,{error:"Produto inválido."});
  const origin=b.origin||`http://localhost:${PORT}`;
  try{
    const session=await stripe.checkout.sessions.create({
      mode:'payment',
      customer_email:b.email||undefined,
      line_items:items.map(i=>({price_data:{currency:'eur',product_data:{name:`${i.brand} ${i.name}`.trim(),description:i.size?`Tamanho ${i.size}`:undefined},unit_amount:Math.round(i.price*100)},quantity:i.quantity})),
      success_url:origin+'/?stripe=success',
      cancel_url:origin+'/?stripe=cancelled',
      metadata:{store:'URBAN.SNEAKERLAB'}
    });
    return out(res,200,{url:session.url,id:session.id});
  }catch(e){console.error('Stripe checkout:',e);return out(res,400,{error:e.message||'Não foi possível criar o checkout.'});}
}
if(p==="/api/orders"&&req.method==="POST"){let b=await body(req);if(!b.email||!Array.isArray(b.items)||!b.items.length)return out(res,400,{error:"Dados incompletos"});let total=0,items=[];for(let i of b.items){let x=db.products.find(x=>x.id===i.productId),q=Number(i.quantity||1);if(!x)return out(res,400,{error:"Produto inválido"});if(q<1||x.stock<q)return out(res,409,{error:"Stock insuficiente"});total+=x.price*q;items.push({productId:x.id,name:x.name,size:i.size||"",quantity:q,unitPrice:x.price})}for(let i of items)db.products.find(x=>x.id===i.productId).stock-=i.quantity;let order={id:"USL-"+Date.now().toString().slice(-8),email:b.email,total:+total.toFixed(2),items,status:"pending_payment",createdAt:new Date().toISOString()};db.orders.unshift(order);save(db);return out(res,201,{order})}
if(p==="/api/orders"&&req.method==="GET"){let e=u.query.email;return out(res,200,{orders:e?db.orders.filter(x=>x.email===e):db.orders})}
if(p==="/api/admin/products"&&req.method==="POST"){let b=await body(req);if(!b.name||!b.brand||b.price==null)return out(res,400,{error:"name, brand e price são obrigatórios"});let x={id:uid(),brand:b.brand,name:b.name,slug:(b.slug||b.name).toLowerCase().replace(/[^a-z0-9]+/g,"-"),price:+b.price,stock:+(b.stock||0),sizes:b.sizes||[],color:b.color||"",active:true};db.products.push(x);save(db);return out(res,201,{product:x})}
if(p==="/api/admin/orders"&&req.method==="GET")return out(res,200,{orders:db.orders});
if(p.startsWith("/api/admin/orders/")&&p.endsWith("/status")&&req.method==="PATCH"){let b=await body(req),oid=p.split("/")[4],o=db.orders.find(x=>x.id===oid),allowed=["pending_payment","paid","processing","shipped","delivered","cancelled"];if(!o)return out(res,404,{error:"Encomenda não encontrada"});if(!allowed.includes(b.status))return out(res,400,{error:"Estado inválido"});o.status=b.status;save(db);return out(res,200,{order:o})}
return out(res,404,{error:"Rota não encontrada"})
}catch(e){console.error(e);return out(res,500,{error:"Erro interno"})}
}).listen(PORT,()=>console.log("URBAN.SNEAKERLAB API em http://localhost:"+PORT));
