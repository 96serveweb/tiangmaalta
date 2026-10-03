const SUPABASE_URL="https://gwkcpbncazaeuiqdxqyn.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3a2NwYm5jYXphZXVpcWR4cXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODgyMzAsImV4cCI6MjEwMzI2NDIzMH0.bA0AwTwXn9TAK3szVxwiC9QQyRde3Dyt0DrSXABFQ1w";
const supabaseClient=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);const $$=selector=>document.querySelectorAll(selector);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const modal=id=>bootstrap.Modal.getOrCreateInstance($(id));const today=()=>new Date().toISOString().slice(0,10);let news=[];
function message(text,type="success"){$("message").innerHTML=`<div class="alert alert-${type}">${esc(text)}</div>`;setTimeout(()=>$("message").innerHTML="",3500)}
function showLogin(errorText=""){
  $("loginScreen").style.display="flex";
  $("dashboardShell").classList.remove("ready");
  $("loginError").textContent=errorText;
  $("loginError").classList.toggle("show",!!errorText);
}

function showDashboard(){
  $("loginScreen").style.display="none";
  $("dashboardShell").classList.add("ready");
}

async function checkCommunicationOfficerSession(){
  const {data:{session},error}=await supabaseClient.auth.getSession();
  if(error)throw error;
  if(!session?.user){showLogin();return false}
  const {data,error:checkError}=await supabaseClient.rpc("is_tmc_communication_officer");
  if(checkError)throw checkError;
  if(data!==true){
    await supabaseClient.auth.signOut();
    showLogin("This account does not have Communication Officer access.");
    return false
  }
  $("adminEmail").textContent=session.user.email||"Communication Officer";
  showDashboard();
  return true
}

async function signInCommunicationOfficer(email,password){
  $("loginBtn").disabled=true;
  $("loginBtn").innerHTML='<i class="fa-solid fa-spinner fa-spin me-1"></i> Signing in...';
  $("loginError").classList.remove("show");
  try{
    const {error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw error;
    const allowed=await checkCommunicationOfficerSession();
    if(allowed)await loadNews();
  }catch(e){
    showLogin(e.message||"Unable to sign in.");
  }finally{
    $("loginBtn").disabled=false;
    $("loginBtn").innerHTML='<i class="fa-solid fa-right-to-bracket me-1"></i> Sign in';
  }
}

$("loginForm").onsubmit=e=>{
  e.preventDefault();
  signInCommunicationOfficer($("loginEmail").value.trim(),$("loginPassword").value);
};
async function loadNews(){const {data,error}=await supabaseClient.from("tmc_news_posts").select("*").order("published_date",{ascending:false}).order("created_at",{ascending:false});if(error)throw error;news=data||[];renderNews()}
function renderNews(){$("newsTable").innerHTML=news.length?news.map(n=>`<tr><td><strong>${esc(n.title)}</strong></td><td>${esc(n.category)}</td><td>${esc(n.published_date)}</td><td><span class="badge ${n.published?'badge-open':'badge-closed'}">${n.published?'Published':'Hidden'}</span></td><td>${esc(n.image_filename||'—')}</td><td class="actions"><button class="btn btn-sm btn-outline-primary me-1" onclick="editNews('${n.id}')">Edit</button><button class="btn btn-sm btn-outline-danger" onclick="deleteNews('${n.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">No news posts yet.</td></tr>`}
function clearNews(){["newsId","newsTitle","newsExcerpt","newsContent","newsImage","newsBadge","newsBadgeText"].forEach(id=>$(id).value="");$("newsCategory").value="Announcements";$("newsDate").value=today();$("newsPublished").checked=true}
$("addNewsBtn").onclick=()=>{clearNews();$("newsModalTitle").textContent="Add news post";modal("newsModal").show()};
window.editNews=id=>{const n=news.find(x=>x.id===id);if(!n)return;clearNews();$("newsModalTitle").textContent="Edit news post";$("newsId").value=n.id;$("newsTitle").value=n.title;$("newsExcerpt").value=n.excerpt||"";$("newsContent").value=n.content;$("newsImage").value=n.image_filename||"";$("newsCategory").value=n.category||"Announcements";$("newsBadge").value=n.badge||"";$("newsBadgeText").value=n.badge_text||"";$("newsDate").value=n.published_date||today();$("newsPublished").checked=!!n.published;modal("newsModal").show()};
$("newsForm").onsubmit=async e=>{e.preventDefault();const id=$("newsId").value;const payload={title:$("newsTitle").value.trim(),excerpt:$("newsExcerpt").value.trim(),content:$("newsContent").value.trim(),image_filename:$("newsImage").value.trim(),category:$("newsCategory").value.trim()||"Announcements",badge:$("newsBadge").value.trim(),badge_text:$("newsBadgeText").value.trim(),published_date:$("newsDate").value||today(),published:$("newsPublished").checked};try{const q=id?supabaseClient.from("tmc_news_posts").update(payload).eq("id",id):supabaseClient.from("tmc_news_posts").insert(payload);const {error}=await q;if(error)throw error;modal("newsModal").hide();await loadNews();message("News post saved.")}catch(e){message(e.message,"danger")}};
window.deleteNews=async id=>{if(!confirm("Delete this news post from the database?"))return;try{const {error}=await supabaseClient.from("tmc_news_posts").delete().eq("id",id);if(error)throw error;await loadNews();message("News post deleted.")}catch(e){message(e.message,"danger")}};
$("mobileMenuBtn").onclick=()=>$("sidebar").classList.toggle("open");$("logoutBtn").onclick=async()=>{await supabaseClient.auth.signOut();showLogin();$("loginPassword").value=""};
(async()=>{try{if(await checkCommunicationOfficerSession())await loadNews()}catch(e){console.error(e);showLogin(e.message||"Unable to load the Communication Officer dashboard.")}})();
