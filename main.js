// ================================================================
// SHARED UTILITIES
// ================================================================

function qs(name){
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setActiveNav(){
  const page = document.body.dataset.page;
  document.querySelectorAll("nav.main-nav a[data-page]").forEach(a=>{
    if(a.dataset.page === page) a.classList.add("active");
  });
}

function initNavToggle(){
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("nav.main-nav");
  if(!toggle || !nav) return;
  toggle.addEventListener("click", ()=> nav.classList.toggle("open"));
}

// ----------------------------------------------------------------
// Session-aware nav — injects Sign In / account links into every page
// ----------------------------------------------------------------
async function renderSessionNav(){
  const nav = document.querySelector("nav.main-nav");
  if(!nav) return;
  const slot = document.createElement("span");
  slot.id = "session-slot";
  slot.style.display = "contents";
  nav.appendChild(slot);

  const session = await getSession();
  if(!session){
    slot.innerHTML = `<a href="login.html" data-page="login">Sign In</a>`;
  } else if(session.role === "owner"){
    slot.innerHTML = `
      <a href="admin.html" data-page="admin">Owner Panel</a>
      <a href="#" id="logout-link">Log Out</a>`;
  } else {
    slot.innerHTML = `
      <span style="opacity:0.7;font-family:var(--mono);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;">Hi, ${session.name.split(" ")[0]}</span>
      <a href="#" id="logout-link">Log Out</a>`;
  }
  setActiveNav();

  const logoutLink = document.getElementById("logout-link");
  if(logoutLink){
    logoutLink.addEventListener("click", async (e)=>{
      e.preventDefault();
      await clearSession();
      window.location.href = "index.html";
    });
  }
}

// ----------------------------------------------------------------
// Facade / photo generator — uses a real uploaded photo if the owner
// added one, otherwise falls back to a drawn Art Deco facade
// ----------------------------------------------------------------
function facadeSVG(variant){
  const brass = "#B98B33";
  const tealMid = "#1E5C56";
  const bands = variant === "deco-2"
    ? `<rect x="0" y="0" width="300" height="170" fill="#0D3833"/>
       <rect x="0" y="0" width="300" height="170" fill="url(#g2)"/>
       <polygon points="150,20 195,60 195,170 105,170 105,60" fill="${tealMid}"/>
       <polygon points="150,20 175,60 150,60 125,60" fill="${brass}"/>
       ${[0,1,2,3,4].map(i=>`<rect x="${115+i*16}" y="${75+i*4}" width="10" height="${90-i*4}" fill="${brass}" opacity="${0.25+i*0.12}"/>`).join("")}
      `
    : `<rect x="0" y="0" width="300" height="170" fill="#0D3833"/>
       <rect x="0" y="0" width="300" height="170" fill="url(#g1)"/>
       <path d="M60 170 V70 A90 90 0 0 1 240 70 V170 Z" fill="${tealMid}"/>
       <path d="M60 170 V70 A90 90 0 0 1 240 70 V170 Z" fill="none" stroke="${brass}" stroke-width="3"/>
       ${[0,1,2,3].map(i=>`<rect x="${95+i*30}" y="${100+i*0}" width="8" height="70" fill="${brass}" opacity="0.35"/>`).join("")}
      `;
  return `
  <svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1E5C56"/><stop offset="1" stop-color="#0D3833"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#12312E"/><stop offset="1" stop-color="#0D3833"/>
      </linearGradient>
    </defs>
    ${bands}
    <rect x="0" y="150" width="300" height="20" fill="${brass}" opacity="0.9"/>
  </svg>`;
}
function facadeMedia(p){
  if(p.images && p.images.length){
    return `<img src="${p.images[0]}" alt="${p.project}" style="width:100%;height:100%;object-fit:cover;">`;
  }
  return facadeSVG(p.facade);
}

// ----------------------------------------------------------------
// Property card renderer
// ----------------------------------------------------------------
function propertyCardHTML(p){
  return `
  <article class="property-card">
    <div class="facade-frame">
      <span class="tag">${p.status}</span>
      ${facadeMedia(p)}
    </div>
    <div class="card-body">
      <h3>${p.project}</h3>
      <div class="card-loc">${p.location}</div>
      <div class="card-specs">
        <span>${p.type}</span>
        <span>${p.area} sq.ft.</span>
        <span>${p.facing||""} facing</span>
      </div>
      <div class="card-price">${p.priceLabel}</div>
      <div class="card-footer">
        <span style="font-size:0.72rem;color:var(--teal);font-family:var(--mono);">${p.possession||""}</span>
        <a href="property.html?id=${p.id}">View Detail →</a>
      </div>
    </div>
  </article>`;
}

// ================================================================
// HOME PAGE
// ================================================================
async function initHomePage(){
  const grid = document.getElementById("featured-grid");
  if(grid){
    const properties = await getProperties();
    grid.innerHTML = properties.slice(0,3).map(propertyCardHTML).join("") ||
      `<p style="color:var(--teal);">No listings yet — check back soon.</p>`;
  }
  const form = document.getElementById("hero-search-form");
  if(form){
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const type = document.getElementById("hero-type").value;
      const locality = document.getElementById("hero-locality").value.trim();
      const params = new URLSearchParams();
      if(type) params.set("type", type);
      if(locality) params.set("q", locality);
      window.location.href = "listings.html" + (params.toString() ? "?"+params.toString() : "");
    });
  }
}

// ================================================================
// LISTINGS PAGE
// ================================================================
async function initListingsPage(){
  const grid = document.getElementById("listings-grid");
  const meta = document.getElementById("results-meta");
  const empty = document.getElementById("empty-state");
  if(!grid) return;

  const properties = await getProperties();

  const typeSelect = document.getElementById("filter-type");
  const localitySelect = document.getElementById("filter-locality");
  const priceSelect = document.getElementById("filter-price");
  const searchInput = document.getElementById("filter-search");

  const localities = [...new Set(properties.map(p=>p.locality))].sort();
  localitySelect.innerHTML = `<option value="">All Localities</option>` +
    localities.map(l=>`<option value="${l}">${l}</option>`).join("");

  const initialType = qs("type");
  const initialQ = qs("q");
  if(initialType) typeSelect.value = initialType;
  if(initialQ) searchInput.value = initialQ;

  function priceInRange(price, band){
    if(!band) return true;
    if(band === "under70") return price < 7000000;
    if(band === "70to120") return price >= 7000000 && price <= 12000000;
    if(band === "above120") return price > 12000000;
    return true;
  }

  function render(){
    const type = typeSelect.value;
    const locality = localitySelect.value;
    const priceBand = priceSelect.value;
    const query = searchInput.value.trim().toLowerCase();

    const results = properties.filter(p=>{
      if(type && p.type !== type) return false;
      if(locality && p.locality !== locality) return false;
      if(!priceInRange(p.price, priceBand)) return false;
      if(query){
        const hay = (p.project + " " + p.location + " " + p.locality).toLowerCase();
        if(!hay.includes(query)) return false;
      }
      return true;
    });

    meta.textContent = `${results.length} propert${results.length===1?"y":"ies"} found`;
    if(results.length === 0){
      grid.innerHTML = "";
      empty.style.display = "block";
    } else {
      empty.style.display = "none";
      grid.innerHTML = results.map(propertyCardHTML).join("");
    }
  }

  [typeSelect, localitySelect, priceSelect].forEach(el=> el.addEventListener("change", render));
  searchInput.addEventListener("input", render);
  render();
}

// ================================================================
// PROPERTY DETAIL PAGE
// ================================================================
async function initDetailPage(){
  const root = document.getElementById("detail-root");
  if(!root) return;
  const id = qs("id");
  const properties = await getProperties();
  const p = properties.find(x=>x.id === id) || properties[0];
  if(!p){
    root.innerHTML = `<div class="container" style="padding:60px 0;text-align:center;">
      <h2>No listings yet</h2><p>The owner hasn't added any properties yet. <a href="index.html">Return home</a>.</p></div>`;
    return;
  }

  document.title = `${p.project} — ${p.type} in ${p.locality} | Marine & Metro Realty`;

  document.getElementById("detail-facade").innerHTML = facadeMedia(p);
  document.getElementById("detail-status-tag").textContent = p.status;
  document.getElementById("detail-title").textContent = p.project;
  document.getElementById("detail-location").textContent = p.location;
  document.getElementById("detail-price").textContent = p.priceLabel;

  document.getElementById("spec-type").textContent = p.type;
  document.getElementById("spec-area").textContent = `${p.area} sq.ft. carpet area`;
  document.getElementById("spec-floor").textContent = p.floor||"—";
  document.getElementById("spec-facing").textContent = p.facing||"—";
  document.getElementById("spec-possession").textContent = p.possession||"—";
  document.getElementById("spec-connectivity").textContent = p.connectivity||"—";

  document.getElementById("amenity-list").innerHTML =
    (p.amenities||[]).map(a=>`<li>${a}</li>`).join("");

  document.getElementById("rera-info").textContent = p.rera||"";

  const descEl = document.getElementById("detail-description");
  if(descEl) descEl.textContent = p.description || "";

  const gallery = document.getElementById("detail-gallery");
  if(gallery){
    if(p.images && p.images.length > 1){
      gallery.innerHTML = p.images.slice(1).map(src=>
        `<img src="${src}" style="width:100%;border-radius:6px;margin-top:10px;">`).join("");
    }
  }

  const enquireBtn = document.getElementById("enquire-btn");
  if(enquireBtn) enquireBtn.href = `contact.html?property=${p.id}`;
  const visitBtn = document.getElementById("visit-btn");
  if(visitBtn) visitBtn.href = `contact.html?property=${p.id}&visit=1`;
}

// ================================================================
// CONTACT / ENQUIRY PAGE
// ================================================================
async function initContactPage(){
  const form = document.getElementById("enquiry-form");
  if(!form) return;

  const session = await getSession();
  if(session && session.role === "customer"){
    const nameField = document.getElementById("field-name");
    const emailField = document.getElementById("field-email");
    const phoneField = document.getElementById("field-phone");
    if(nameField && !nameField.value) nameField.value = session.name;
    if(emailField && !emailField.value) emailField.value = session.email;
    if(phoneField && !phoneField.value) phoneField.value = session.phone || "";
  }

  const propId = qs("property");
  const wantsVisit = qs("visit");
  let propertyName = "General Enquiry";
  if(propId){
    const p = await getPropertyById(propId);
    if(p){
      propertyName = p.project;
      const note = document.getElementById("prefill-note");
      if(note){
        note.style.display = "block";
        note.textContent = `Enquiring about: ${p.project}, ${p.type} in ${p.locality} (${p.priceLabel})`;
      }
      const msgField = document.getElementById("field-message");
      if(msgField && !msgField.value){
        msgField.value = wantsVisit
          ? `I would like to schedule a site visit for ${p.project}, ${p.locality}.`
          : `I am interested in ${p.project}, ${p.locality}. Please share more details.`;
      }
    }
  }

  form.addEventListener("submit", async function(e){
    e.preventDefault();
    let valid = true;

    const nameRow = document.getElementById("row-name");
    const nameInput = document.getElementById("field-name");
    if(nameInput.value.trim().length < 2){ nameRow.classList.add("invalid"); valid = false; }
    else nameRow.classList.remove("invalid");

    const phoneRow = document.getElementById("row-phone");
    const phoneInput = document.getElementById("field-phone");
    const phoneDigits = phoneInput.value.replace(/\D/g,"");
    if(phoneDigits.length !== 10){ phoneRow.classList.add("invalid"); valid = false; }
    else phoneRow.classList.remove("invalid");

    const emailRow = document.getElementById("row-email");
    const emailInput = document.getElementById("field-email");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(emailInput.value.trim() && !emailPattern.test(emailInput.value.trim())){
      emailRow.classList.add("invalid"); valid = false;
    } else emailRow.classList.remove("invalid");

    const msgRow = document.getElementById("row-message");
    const msgInput = document.getElementById("field-message");
    if(msgInput.value.trim().length < 5){ msgRow.classList.add("invalid"); valid = false; }
    else msgRow.classList.remove("invalid");

    if(!valid) return;

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    await addEnquiry({
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      message: msgInput.value.trim(),
      propertyId: propId || null,
      propertyName
    });

    const banner = document.getElementById("success-banner");
    banner.classList.add("show");
    banner.textContent = "Thank you — your enquiry has been received. Our team will call you back shortly.";
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Enquiry";
    window.scrollTo({top: banner.offsetTop - 100, behavior:"smooth"});
  });
}

// ================================================================
// INIT
// ================================================================
document.addEventListener("DOMContentLoaded", async ()=>{
  initNavToggle();
  await renderSessionNav();
  await initHomePage();
  await initListingsPage();
  await initDetailPage();
  await initContactPage();
});
