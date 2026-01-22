
// Replace with your NewsAPI key if you want live data
const NEWSAPI_KEY = 'f1519ee0c3dd47e183981cc3d9409c12';
const BASE_NEWSAPI = 'https://newsapi.org/v2/top-headlines';
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes cache

const selectors = {
  featuredInner: document.getElementById('featuredInner'),
  newsGrid: document.getElementById('newsGrid'),
  categoryFilter: document.getElementById('categoryFilter'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  year: document.getElementById('year'),
  themeBtn: document.getElementById('themeBtn'),
  authArea: document.getElementById('authArea'),
  userArea: document.getElementById('userArea'),
  welcomeUser: document.getElementById('welcomeUser'),
  loginBtn: document.getElementById('loginBtn'),
  signupBtn: document.getElementById('signupBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  dashboardBtn: document.getElementById('dashboardBtn'),
  ctaPostBtn: document.getElementById('ctaPostBtn'),
  ctaPostBtn2: document.getElementById('ctaPostBtn2'),
  postModal: new bootstrap.Modal(document.getElementById('postModal')),
  loginModal: new bootstrap.Modal(document.getElementById('loginModal')),
  signupModal: new bootstrap.Modal(document.getElementById('signupModal')),
  viewModal: new bootstrap.Modal(document.getElementById('viewModal')),
  dashboardModal: new bootstrap.Modal(document.getElementById('dashboardModal')),
  postForm: document.getElementById('postForm'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  postImage: document.getElementById('postImage'),
  postHeadline: document.getElementById('postHeadline'),
  postDescription: document.getElementById('postDescription'),
  postCategory: document.getElementById('postCategory'),
  featuredCarousel: document.getElementById('featuredCarousel'),
  viewBody: document.getElementById('viewBody'),
  dashboardBody: document.getElementById('dashboardBody'),
  contactForm: document.getElementById('contactForm'),
  loginError: document.getElementById('loginError'),
  signupError: document.getElementById('signupError'),
  postError: document.getElementById('postError'),
  countryFilter: document.getElementById('countryFilter'),
  catTabs: document.querySelectorAll('.cat-tab'),
  catLinks: document.querySelectorAll('.cat-link'),
  trendingWrap: document.getElementById('trendingWrap'),
  dropZone: document.getElementById('dropZone'),
  pickImageBtn: document.getElementById('pickImageBtn'),
  imagePreview: document.getElementById('imagePreview'),
  loadMoreWrap: document.getElementById('loadMoreWrap')
};

let allNews = []; // public feed from API or cache
let displayedCount = 8;
let featuredItems = [];
let currentUser = null;
let editingPostId = null;

// Storage helpers
const storage = {
  getUsers(){ return JSON.parse(localStorage.getItem('pn_users') || '[]') },
  saveUsers(u){ localStorage.setItem('pn_users', JSON.stringify(u)) },
  getUserPosts(){ return JSON.parse(localStorage.getItem('pn_user_posts') || '[]') },
  saveUserPosts(p){ localStorage.setItem('pn_user_posts', JSON.stringify(p)) },
  getLikes(){ return JSON.parse(localStorage.getItem('pn_likes') || '{}') },
  saveLikes(l){ localStorage.setItem('pn_likes', JSON.stringify(l)) },
  setSessionUser(u){ sessionStorage.setItem('pn_current_user', JSON.stringify(u)) },
  getSessionUser(){ return JSON.parse(sessionStorage.getItem('pn_current_user') || 'null') },
  clearSession(){ sessionStorage.removeItem('pn_current_user') },
  getCache(){ return JSON.parse(localStorage.getItem('pn_cache') || '{}') },
  setCache(c){ localStorage.setItem('pn_cache', JSON.stringify(c)) }
};

// Sample fallback
const sampleData = [
  {
    source:{name:'Sample Source'},
    author:'Jane Doe',
    title:'Local community garden blooms after rainy season',
    description:'Volunteers gathered to plant new seedlings and restore pathways.',
    urlToImage:'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1200&q=80',
    publishedAt: new Date().toISOString(),
    url:'#',
    category:'general'
  },
  {
    source:{name:'Sports Desk'},
    author:'John Smith',
    title:'City team clinches dramatic victory in final minutes',
    description:'A last-second goal sealed the win in front of a roaring crowd.',
    urlToImage:'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80',
    publishedAt: new Date().toISOString(),
    url:'#',
    category:'sports'
  }
];

// Init
document.addEventListener('DOMContentLoaded', init);

function init(){
  selectors.year.textContent = new Date().getFullYear();
  currentUser = storage.getSessionUser();
  updateAuthUI();

  // theme
  const savedTheme = localStorage.getItem('pn_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);
  selectors.themeBtn.addEventListener('click', toggleTheme);

  // events
  selectors.searchBtn.addEventListener('click', applyFilters);
  selectors.countryFilter.addEventListener('change', applyFilters);
  selectors.catTabs.forEach(t => t.addEventListener('click', (e)=>{ selectors.catTabs.forEach(x=>x.classList.remove('active')); e.currentTarget.classList.add('active'); selectors.categoryFilter = e.currentTarget.getAttribute('data-cat'); applyFilters(); }));
  selectors.catLinks.forEach(l => l.addEventListener('click', (e)=>{ e.preventDefault(); const cat = e.currentTarget.getAttribute('data-cat'); document.querySelectorAll('.cat-tab').forEach(x=>x.classList.remove('active')); document.querySelector('.cat-tab[data-cat="'+cat+'"]')?.classList.add('active'); selectors.categoryFilter = cat; document.getElementById('countryFilter').value = ''; applyFilters(); }));
  selectors.loadMoreBtn.addEventListener('click', loadMore);
  selectors.loginBtn.addEventListener('click', ()=>selectors.loginModal.show());
  selectors.signupBtn.addEventListener('click', ()=>selectors.signupModal.show());
  selectors.logoutBtn.addEventListener('click', logout);
  selectors.dashboardBtn.addEventListener('click', openDashboard);
  selectors.ctaPostBtn.addEventListener('click', openPostModal);
  selectors.ctaPostBtn2.addEventListener('click', openPostModal);

  selectors.postForm.addEventListener('submit', handlePostSubmit);
  selectors.loginForm.addEventListener('submit', handleLogin);
  selectors.signupForm.addEventListener('submit', handleSignup);
  selectors.contactForm.addEventListener('submit', (e)=>{ e.preventDefault(); alert('Thanks — message received.'); e.target.reset(); });

  // drag & drop image
  selectors.pickImageBtn.addEventListener('click', ()=>selectors.postImage.click());
  selectors.dropZone.addEventListener('click', ()=>selectors.postImage.click());
  selectors.dropZone.addEventListener('dragover', (e)=>{ e.preventDefault(); selectors.dropZone.classList.add('dragover'); });
  selectors.dropZone.addEventListener('dragleave', ()=>selectors.dropZone.classList.remove('dragover'));
  selectors.dropZone.addEventListener('drop', (e)=>{ e.preventDefault(); selectors.dropZone.classList.remove('dragover'); const f = e.dataTransfer.files[0]; if(f) handleFileSelect(f); });
  selectors.postImage.addEventListener('change', (e)=>{ if(e.target.files[0]) handleFileSelect(e.target.files[0]); });

  // fetch news (with caching)
  fetchNews().then(() => {
    renderFeatured();
    renderTrending();
    renderNewsGrid();
  });
}

// Theme
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  localStorage.setItem('pn_theme', theme);
  selectors.themeBtn.innerHTML = theme === 'dark' ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
}
function toggleTheme(){ const current = localStorage.getItem('pn_theme') || 'light'; applyTheme(current === 'dark' ? 'light' : 'dark'); }

// Auth
function updateAuthUI(){
  currentUser = storage.getSessionUser();
  if(currentUser){
    selectors.authArea.classList.add('d-none');
    selectors.userArea.classList.remove('d-none');
    selectors.welcomeUser.textContent = `Hi, ${currentUser.name}`;
  } else {
    selectors.authArea.classList.remove('d-none');
    selectors.userArea.classList.add('d-none');
  }
}

function handleSignup(e){
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const users = storage.getUsers();
  if(users.find(u=>u.email===email)){
    selectors.signupError.textContent = 'An account with that email already exists.';
    selectors.signupError.classList.remove('d-none');
    return;
  }
  const newUser = { id: Date.now(), name, email, password };
  users.push(newUser);
  storage.saveUsers(users);
  storage.setSessionUser({ id:newUser.id, name:newUser.name, email:newUser.email });
  selectors.signupModal.hide();
  selectors.signupForm.reset();
  selectors.signupError.classList.add('d-none');
  updateAuthUI();
}

function handleLogin(e){
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const users = storage.getUsers();
  const user = users.find(u=>u.email===email && u.password===password);
  if(!user){
    selectors.loginError.textContent = 'Invalid email or password.';
    selectors.loginError.classList.remove('d-none');
    return;
  }
  storage.setSessionUser({ id:user.id, name:user.name, email:user.email });
  selectors.loginModal.hide();
  selectors.loginForm.reset();
  selectors.loginError.classList.add('d-none');
  updateAuthUI();
}

function logout(){ storage.clearSession(); updateAuthUI(); }

// File handling (preview)
let lastSelectedFile = null;
async function handleFileSelect(file){
  lastSelectedFile = file;
  const base64 = await fileToBase64(file);
  selectors.imagePreview.src = base64;
  selectors.imagePreview.alt = file.name;
  selectors.imagePreview.classList.remove('d-none');
}

// convert file to base64
function fileToBase64(file){
  return new Promise((res, rej)=>{
    const reader = new FileReader();
    reader.onload = ()=>res(reader.result);
    reader.onerror = ()=>rej('error');
    reader.readAsDataURL(file);
  });
}

// Fetch news with caching and country/category support
async function fetchNews(){
  try{
    const cache = storage.getCache();
    const cacheKey = 'top_headlines';
    const now = Date.now();
    if(cache[cacheKey] && (now - cache[cacheKey].ts) < CACHE_TTL_MS){
      allNews = cache[cacheKey].data;
      featuredItems = allNews.slice(0,4);
      return;
    }

    if(NEWSAPI_KEY && NEWSAPI_KEY !== 'YOUR_NEWSAPI_KEY'){
      // default: no country param; user can filter by country client-side or we can fetch per-country when requested
      const url = `${BASE_NEWSAPI}?language=en&pageSize=40&apiKey=${NEWSAPI_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if(data && data.articles){
        allNews = data.articles.map(a => ({...a, category: mapSourceToCategory(a)}));
      } else {
        allNews = sampleData.slice();
      }
    } else {
      allNews = sampleData.slice();
    }
    featuredItems = allNews.slice(0,4);
    cache[cacheKey] = { ts: now, data: allNews };
    storage.setCache(cache);
  } catch(err){
    console.warn('Fetch failed, using sample data', err);
    allNews = sampleData.slice();
    featuredItems = allNews.slice(0,4);
  }
}

// map source to category (best-effort)
function mapSourceToCategory(article){
  const t = (article.title || '').toLowerCase() + ' ' + (article.description || '').toLowerCase();
  if(/sport|match|goal|league|tournament|score/.test(t)) return 'sports';
  if(/econom|market|business|stock|finance|economic/.test(t)) return 'business';
  if(/religion|church|mosque|faith|spiritual/.test(t)) return 'religion';
  if(/politic|president|government|senate|parliament|election/.test(t)) return 'politics';
  if(/tech|software|app|device|ai|computer|internet/.test(t)) return 'technology';
  if(/entertain|movie|film|music|celebrity|tv/.test(t)) return 'entertainment';
  return 'general';
}

// Render featured carousel
function renderFeatured(){
  selectors.featuredInner.innerHTML = '';
  const items = featuredItems.slice(0,4);
  if(items.length === 0){
    selectors.featuredInner.innerHTML = `<div class="carousel-item active"><div class="featured-card" style="background:#333"><h4>No featured items</h4></div></div>`;
    return;
  }
  items.forEach((it, idx)=>{
    const active = idx === 0 ? 'active' : '';
    const bg = it.urlToImage || 'https://via.placeholder.com/1200x600.png?text=PulseNews';
    const title = escapeHtml(it.title || 'Untitled');
    const source = escapeHtml(it.source?.name || it.author || 'Unknown');
    const published = new Date(it.publishedAt).toLocaleString();
    const el = document.createElement('div');
    el.className = `carousel-item ${active}`;
    el.innerHTML = `
      <div class="featured-card" style="background-image:url('${bg}')">
        <div>
          <span class="badge bg-primary badge-cat">${escapeHtml(it.category || 'General')}</span>
          <h4 class="mt-2">${title}</h4>
          <p class="small-muted mb-0">${source} • ${published}</p>
          <div class="mt-2">
            <button class="btn btn-sm btn-light view-btn" data-url="${escapeHtml(it.url || '')}">Read</button>
          </div>
        </div>
      </div>
    `;
    selectors.featuredInner.appendChild(el);
  });

  document.querySelectorAll('.view-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const url = e.currentTarget.getAttribute('data-url');
      const item = allNews.find(a=>a.url===url) || featuredItems[0];
      openViewModal(item);
    });
  });

  try{ bootstrap.Carousel.getOrCreateInstance(selectors.featuredCarousel).cycle(); }catch(e){}
}

// Render trending (most liked or most commented)
function renderTrending(){
  const likes = storage.getLikes();
  const posts = allNews.map(a => {
    const id = a.url || a.title;
    const l = likes[id] || { likes:0, dislikes:0 };
    const comments = JSON.parse(localStorage.getItem('pn_comments_' + id) || '[]');
    return { item: a, score: (l.likes - l.dislikes) + comments.length };
  }).sort((a,b)=>b.score - a.score).slice(0,4);

  if(posts.length === 0){ selectors.trendingWrap.innerHTML = ''; return; }
  selectors.trendingWrap.innerHTML = `<div class="d-flex gap-2 align-items-center"><span class="trending-badge">Trending</span><div class="small text-muted ms-2">Top stories</div></div><div class="mt-2 d-flex gap-2 flex-wrap">${posts.map(p=>`<button class="btn btn-sm btn-outline-secondary trending-item" data-url="${escapeHtml(p.item.url||'')}">${escapeHtml(p.item.title.slice(0,60))}</button>`).join('')}</div>`;
  document.querySelectorAll('.trending-item').forEach(b=> b.addEventListener('click', (e)=>{ const url = e.currentTarget.getAttribute('data-url'); const it = allNews.find(a=>a.url===url); if(it) openViewModal(it); }));
}

// Render news grid with lazy loading and animations
function renderNewsGrid(reset=false){
  if(reset) displayedCount = 8;
  const country = selectors.countryFilter.value;
  const q = selectors.searchInput.value.trim().toLowerCase();
  const activeCat = document.querySelector('.cat-tab.active')?.getAttribute('data-cat') || '';

  let list = allNews.slice();
  if(country){
    // If user selected a country, try to fetch country-specific headlines from API (cache per country)
    fetchNewsByCountry(country).then(()=>{ renderNewsGrid(true); });
    // show current cached list until fetch completes
  }
  if(activeCat) list = list.filter(n => (n.category || '').toLowerCase() === activeCat.toLowerCase());
  if(q) list = list.filter(n => (n.title + ' ' + (n.description||'')).toLowerCase().includes(q));
  const toShow = list.slice(0, displayedCount);
  selectors.newsGrid.innerHTML = '';
  if(toShow.length === 0){
    selectors.newsGrid.innerHTML = `<div class="col-12"><p class="text-muted">No news found.</p></div>`;
    selectors.loadMoreWrap.style.display = 'none';
    return;
  }

  toShow.forEach(item=>{
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 fade-in';
    const img = item.urlToImage || 'https://via.placeholder.com/600x400.png?text=PulseNews';
    const title = escapeHtml(item.title || 'Untitled');
    const desc = escapeHtml((item.description || '').slice(0,140));
    const source = escapeHtml(item.source?.name || item.author || 'Unknown');
    const published = new Date(item.publishedAt).toLocaleDateString();
    col.innerHTML = `
      <div class="card h-100" role="article">
        <img src="${img}" class="card-img-top news-card-img" alt="${title}" loading="lazy">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge bg-secondary badge-cat">${escapeHtml(item.category || 'General')}</span>
            <small class="news-meta">${source} • ${published}</small>
          </div>
          <h5 class="card-title">${title}</h5>
          <p class="card-text">${desc}...</p>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <div>
              <button class="btn btn-sm btn-outline-primary view-full" data-url="${escapeHtml(item.url || '')}" aria-label="Read full article">Read</button>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <button class="btn btn-sm btn-light like-btn" data-id="${escapeHtml(item.url || title)}" aria-label="Like"><i class="fa-regular fa-thumbs-up"></i> <span class="like-count">0</span></button>
              <button class="btn btn-sm btn-light dislike-btn" data-id="${escapeHtml(item.url || title)}" aria-label="Dislike"><i class="fa-regular fa-thumbs-down"></i> <span class="dislike-count">0</span></button>
            </div>
          </div>
        </div>
      </div>
    `;
    selectors.newsGrid.appendChild(col);
  });

  // handlers
  document.querySelectorAll('.view-full').forEach(b=> b.addEventListener('click', (e)=>{ const url = e.currentTarget.getAttribute('data-url'); const item = allNews.find(a=>a.url===url) || allNews[0]; openViewModal(item); }));
  document.querySelectorAll('.like-btn').forEach(b=> b.addEventListener('click', (e)=>{ const id = e.currentTarget.getAttribute('data-id'); toggleLike(id, true, e.currentTarget); }));
  document.querySelectorAll('.dislike-btn').forEach(b=> b.addEventListener('click', (e)=>{ const id = e.currentTarget.getAttribute('data-id'); toggleLike(id, false, e.currentTarget); }));

  refreshLikeCounts();
  selectors.loadMoreWrap.style.display = list.length > displayedCount ? 'block' : 'none';
}

async function fetchNewsByCountry(country){
  if(!NEWSAPI_KEY || NEWSAPI_KEY === 'YOUR_NEWSAPI_KEY') return;
  const cache = storage.getCache();
  const key = 'country_' + country;
  const now = Date.now();
  if(cache[key] && (now - cache[key].ts) < CACHE_TTL_MS){
    allNews = cache[key].data;
    featuredItems = allNews.slice(0,4);
    return;
  }
  try{
    const url = `${BASE_NEWSAPI}?country=${country}&pageSize=40&apiKey=${NEWSAPI_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if(data && data.articles){
      allNews = data.articles.map(a => ({...a, category: mapSourceToCategory(a)}));
      featuredItems = allNews.slice(0,4);
      cache[key] = { ts: now, data: allNews };
      storage.setCache(cache);
    }
  }catch(e){ console.warn('country fetch failed', e); }
}

// Filters
function applyFilters(){ displayedCount = 8; renderNewsGrid(true); }
function loadMore(){ displayedCount += 8; renderNewsGrid(); }

// Likes/dislikes with simple notifications
function toggleLike(id, isLike, btn){
  const likes = storage.getLikes();
  if(!likes[id]) likes[id] = { likes:0, dislikes:0, users:[] };
  const user = storage.getSessionUser();
  const uid = user ? user.id : 'anon';
  const existing = likes[id].users.find(u=>u.uid===uid);
  if(existing){
    if(existing.isLike === isLike){
      likes[id].users = likes[id].users.filter(u=>u.uid!==uid);
    } else {
      existing.isLike = isLike;
    }
  } else {
    likes[id].users.push({ uid, isLike, name: user ? user.name : 'Anonymous' });
  }
  likes[id].likes = likes[id].users.filter(u=>u.isLike).length;
  likes[id].dislikes = likes[id].users.filter(u=>!u.isLike).length;
  storage.saveLikes(likes);
  refreshLikeCounts();
  // notify owner if applicable (for demo, we show a small alert)
  if(user){
    showToast(`Your reaction was recorded`);
  }
}

function refreshLikeCounts(){
  const likes = storage.getLikes();
  document.querySelectorAll('.like-btn').forEach(btn=>{
    const id = btn.getAttribute('data-id');
    const count = likes[id] ? likes[id].likes : 0;
    btn.querySelector('.like-count').textContent = count;
  });
  document.querySelectorAll('.dislike-btn').forEach(btn=>{
    const id = btn.getAttribute('data-id');
    const count = likes[id] ? likes[id].dislikes : 0;
    btn.querySelector('.dislike-count').textContent = count;
  });
}

// View modal with threaded comments, like lists, and related items
function openViewModal(item){
  const img = item.urlToImage || 'https://via.placeholder.com/1200x600.png?text=PulseNews';
  const title = escapeHtml(item.title || 'Untitled');
  const source = escapeHtml(item.source?.name || item.author || 'Unknown');
  const published = new Date(item.publishedAt).toLocaleString();
  const desc = escapeHtml(item.description || '');
  const id = item.url || item.title || 'item_' + Math.random();

  const commentsKey = 'pn_comments_' + id;
  const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');

  selectors.viewBody.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-lg-8">
          <img src="${img}" class="img-fluid rounded mb-3" alt="${title}" loading="lazy">
          <h3>${title}</h3>
          <p class="small-muted">${source} • ${published}</p>
          <p>${desc}</p>

          <div class="d-flex gap-2 mb-3">
            <button class="btn btn-outline-primary btn-sm view-like" data-id="${id}" aria-label="Like"><i class="fa-regular fa-thumbs-up"></i> <span class="view-like-count">0</span></button>
            <button class="btn btn-outline-secondary btn-sm view-dislike" data-id="${id}" aria-label="Dislike"><i class="fa-regular fa-thumbs-down"></i> <span class="view-dislike-count">0</span></button>
            <a href="${item.url || '#'}" target="_blank" class="btn btn-sm btn-success">Open source</a>
          </div>

          <hr>
          <h6>Comments</h6>
          <div id="commentsWrap">
            ${renderCommentsHtml(comments)}
          </div>

          <div id="commentFormWrap" class="mt-3">
            ${ storage.getSessionUser() ? `
              <form id="commentForm">
                <div class="mb-2">
                  <textarea id="commentText" class="form-control" rows="3" placeholder="Write a comment..." required></textarea>
                </div>
                <button class="btn btn-primary btn-sm" type="submit">Post comment</button>
              </form>
            ` : `<p class="text-muted">Please log in to comment.</p>`}
          </div>
        </div>

        <div class="col-lg-4">
          <h6>More from ${source}</h6>
          <div id="relatedWrap"></div>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.view-like').forEach(b=> b.addEventListener('click', (e)=>{ toggleLike(id, true, e.currentTarget); updateViewLikeCounts(id); }));
  document.querySelectorAll('.view-dislike').forEach(b=> b.addEventListener('click', (e)=>{ toggleLike(id, false, e.currentTarget); updateViewLikeCounts(id); }));
  updateViewLikeCounts(id);

  const commentForm = document.getElementById('commentForm');
  if(commentForm){
    commentForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const text = document.getElementById('commentText').value.trim();
      const user = storage.getSessionUser();
      if(!user) { alert('Please login to comment.'); return; }
      const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');
      comments.unshift({ id: Date.now(), name: user.name, text, at: new Date().toISOString(), userId: user.id, replies: [] });
      localStorage.setItem(commentsKey, JSON.stringify(comments));
      document.getElementById('commentsWrap').innerHTML = renderCommentsHtml(comments);
      attachCommentReplyHandlers(id);
      commentForm.reset();
      renderTrending();
    });
    attachCommentReplyHandlers(id);
  }

  // related items
  const related = allNews.filter(n=>n.source?.name === item.source?.name && n.title !== item.title).slice(0,4);
  const relatedWrap = document.getElementById('relatedWrap');
  relatedWrap.innerHTML = related.map(r=>`<div class="mb-2"><a href="#" class="related-link" data-url="${escapeHtml(r.url || '')}">${escapeHtml(r.title)}</a></div>`).join('');
  relatedWrap.querySelectorAll('.related-link').forEach(l=> l.addEventListener('click', (e)=>{ e.preventDefault(); const url = e.currentTarget.getAttribute('data-url'); const it = allNews.find(a=>a.url===url); if(it) openViewModal(it); }));

  selectors.viewModal.show();
}

function renderCommentsHtml(comments){
  if(!comments || comments.length === 0) return '<p class="text-muted">No comments yet.</p>';
  return comments.map(c=>`
    <div class="mb-2 border rounded p-2">
      <div class="d-flex justify-content-between">
        <strong>${escapeHtml(c.name)}</strong>
        <small class="text-muted">${new Date(c.at).toLocaleString()}</small>
      </div>
      <div class="mt-1">${escapeHtml(c.text)}</div>
      <div class="mt-2">
        <button class="btn btn-sm btn-link reply-btn" data-id="${c.id}">Reply</button>
        ${c.replies && c.replies.length ? `<div class="mt-2 ms-3">${c.replies.map(r=>`<div class="mb-1"><strong>${escapeHtml(r.name)}</strong> <small class="text-muted">• ${new Date(r.at).toLocaleString()}</small><div>${escapeHtml(r.text)}</div></div>`).join('')}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function attachCommentReplyHandlers(itemId){
  document.querySelectorAll('.reply-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const cid = e.currentTarget.getAttribute('data-id');
      const commentsKey = 'pn_comments_' + itemId;
      const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');
      const comment = comments.find(c=>String(c.id) === String(cid));
      if(!comment) return;
      const user = storage.getSessionUser();
      if(!user){ alert('Please login to reply.'); return; }
      const replyText = prompt('Reply to comment:');
      if(!replyText) return;
      comment.replies = comment.replies || [];
      comment.replies.push({ id: Date.now(), name: user.name, text: replyText, at: new Date().toISOString() });
      localStorage.setItem(commentsKey, JSON.stringify(comments));
      document.getElementById('commentsWrap').innerHTML = renderCommentsHtml(comments);
      attachCommentReplyHandlers(itemId);
    });
  });
}

function updateViewLikeCounts(id){
  const likes = storage.getLikes();
  const data = likes[id] || { likes:0, dislikes:0, users:[] };
  document.querySelectorAll('.view-like .view-like-count').forEach(el=>el.textContent = data.likes || 0);
  document.querySelectorAll('.view-dislike .view-dislike-count').forEach(el=>el.textContent = data.dislikes || 0);
  refreshLikeCounts();
}

// Post news (only visible to owner in dashboard)
async function handlePostSubmit(e){
  e.preventDefault();
  const user = storage.getSessionUser();
  if(!user){ selectors.postError.textContent = 'You must be logged in to post.'; selectors.postError.classList.remove('d-none'); return; }
  const headline = selectors.postHeadline.value.trim();
  const description = selectors.postDescription.value.trim();
  const category = selectors.postCategory.value;
  let imgBase64 = '';
  if(lastSelectedFile){
    imgBase64 = await fileToBase64(lastSelectedFile);
  } else {
    selectors.postError.textContent = 'Please upload a cover image.'; selectors.postError.classList.remove('d-none'); return;
  }

  if(editingPostId){
    let posts = storage.getUserPosts();
    const idx = posts.findIndex(p=>p.id===editingPostId);
    if(idx > -1){
      posts[idx] = { ...posts[idx], title: headline, description, urlToImage: imgBase64, category, publishedAt: new Date().toISOString() };
      storage.saveUserPosts(posts);
      editingPostId = null;
    }
  } else {
    const post = {
      id: 'userpost_' + Date.now(),
      source:{name:user.name},
      author: user.name,
      title: headline,
      description,
      urlToImage: imgBase64,
      publishedAt: new Date().toISOString(),
      url: '#',
      category,
      ownerId: user.id
    };
    const posts = storage.getUserPosts();
    posts.unshift(post);
    storage.saveUserPosts(posts);
  }

  selectors.postModal.hide();
  selectors.postForm.reset();
  selectors.imagePreview.classList.add('d-none');
  lastSelectedFile = null;
  selectors.postError.classList.add('d-none');
  showToast('Your post was saved to your dashboard');
}

// Dashboard: view, edit, delete user posts
function openDashboard(){
  const user = storage.getSessionUser();
  if(!user){ selectors.loginModal.show(); return; }
  const posts = storage.getUserPosts().filter(p => p.ownerId === user.id);
  selectors.dashboardBody.innerHTML = `
    <h6>Your posts</h6>
    <div id="userPostsWrap" class="mb-4">
      ${posts.length === 0 ? '<p class="text-muted">You have not posted any news yet.</p>' : posts.map(p=>`
        <div class="card mb-3">
          <div class="row g-0">
            <div class="col-md-4">
              <img src="${p.urlToImage}" class="img-fluid rounded-start" alt="${escapeHtml(p.title)}">
            </div>
            <div class="col-md-8">
              <div class="card-body">
                <h5 class="card-title">${escapeHtml(p.title)}</h5>
                <p class="card-text small-muted">${new Date(p.publishedAt).toLocaleString()}</p>
                <p class="card-text">${escapeHtml(p.description).slice(0,200)}...</p>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-primary view-user-post" data-id="${p.id}">View</button>
                  <button class="btn btn-sm btn-outline-secondary edit-user-post" data-id="${p.id}">Edit</button>
                  <button class="btn btn-sm btn-danger delete-user-post" data-id="${p.id}">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  document.querySelectorAll('.view-user-post').forEach(b=> b.addEventListener('click', (e)=>{ const id = e.currentTarget.getAttribute('data-id'); const post = storage.getUserPosts().find(p=>p.id===id); if(post) openViewModal(post); }));
  document.querySelectorAll('.edit-user-post').forEach(b=> b.addEventListener('click', (e)=>{ const id = e.currentTarget.getAttribute('data-id'); const post = storage.getUserPosts().find(p=>p.id===id); if(post) openEditPost(post); }));
  document.querySelectorAll('.delete-user-post').forEach(b=> b.addEventListener('click', (e)=>{ const id = e.currentTarget.getAttribute('data-id'); if(!confirm('Delete this post?')) return; let posts = storage.getUserPosts(); posts = posts.filter(p=>p.id!==id); storage.saveUserPosts(posts); openDashboard(); }));
  selectors.dashboardModal.show();
}

function openEditPost(post){
  editingPostId = post.id;
  selectors.postHeadline.value = post.title;
  selectors.postDescription.value = post.description;
  selectors.postCategory.value = post.category || 'general';
  selectors.imagePreview.src = post.urlToImage;
  selectors.imagePreview.classList.remove('d-none');
  selectors.postModal.show();
}

// small helpers
function escapeHtml(str){
  if(!str) return '';
  return String(str).replace(/[&<>"'`=\/]/g, function(s) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' })[s];
  });
}

// Toast (simple)
function showToast(msg){
  const t = document.createElement('div');
  t.className = 'toast align-items-center text-bg-dark border-0';
  t.style.position = 'fixed'; t.style.right = '1rem'; t.style.bottom = '1rem'; t.style.zIndex = 1080;
  t.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  document.body.appendChild(t);
  const bs = new bootstrap.Toast(t, { delay: 2500 });
  bs.show();
  t.addEventListener('hidden.bs.toast', ()=> t.remove());
}

// Utility: show post modal (requires login)
function openPostModal(){
  if(!storage.getSessionUser()){ selectors.loginModal.show(); return; }
  editingPostId = null;
  selectors.postForm.reset();
  selectors.imagePreview.classList.add('d-none');
  lastSelectedFile = null;
  selectors.postModal.show();
}

// Utility: convert file to base64
function fileToBase64(file){
  return new Promise((res, rej)=>{
    const reader = new FileReader();
    reader.onload = ()=>res(reader.result);
    reader.onerror = ()=>rej('error');
    reader.readAsDataURL(file);
  });
}