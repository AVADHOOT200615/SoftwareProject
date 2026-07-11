// ================================================================
// SHARED UTILITIES
// ================================================================

function qs(name){
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setActiveNav(){
  const page = document.body.dataset.page;
  document.querySelectorAll("nav.main-nav a").forEach(a=>{
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
// Facade SVG generator — Art Deco building illustration per card
// (drawn in code, so listings work without any external images)
// ----------------------------------------------------------------
function facadeSVG(variant, statusLabel){
  const brass = "#B98B33";
  const ivory = "#F7F5EF";
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
        <stop offset="0" stop-color="#1E5C56"/>
        <stop offset="1" stop-color="#0D3833"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#12312E"/>
        <stop offset="1" stop-color="#0D3833"/>
      </linearGradient>
    </defs>
    ${bands}
    <rect x="0" y="150" width="300" height="20" fill="${brass}" opacity="0.9"/>
  </svg>`;
}

// ----------------------------------------------------------------
// Property card renderer
// ----------------------------------------------------------------
function propertyCardHTML(p){
  return `
  <article class="property-card">
    <div class="facade-frame">
      <span class="tag">${p.status}</span>
      ${facadeSVG(p.facade)}
    </div>
    <div class="card-body">
      <h3>${p.project}</h3>
      <div class="card-loc">${p.location}</div>
      <div class="card-specs">
        <span>${p.type}</span>
        <span>${p.area} sq.ft.</span>
        <span>${p.facing} facing</span>
      </div>
      <div class="card-price">${p.priceLabel}</div>
      <div class="card-footer">
        <span style="font-size:0.72rem;color:var(--teal);font-family:var(--mono);">${p.possession}</span>
        <a href="property.html?id=${p.id}">View Detail →</a>
      </div>
    </div>
  </article>`;
}

// ================================================================
// HOME PAGE — featured listings + hero search redirect
// ================================================================
function initHomePage(){
  const grid = document.getElementById("featured-grid");
  if(grid){
    const featured = PROPERTIES.slice(0,3);
    grid.innerHTML = featured.map(propertyCardHTML).join("");
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
// LISTINGS PAGE — filter + search
// ================================================================
function initListingsPage(){
  const grid = document.getElementById("listings-grid");
  const meta = document.getElementById("results-meta");
  const empty = document.getElementById("empty-state");
  if(!grid) return;

  const typeSelect = document.getElementById("filter-type");
  const localitySelect = document.getElementById("filter-locality");
  const priceSelect = document.getElementById("filter-price");
  const searchInput = document.getElementById("filter-search");

  // populate locality options dynamically from data
  const localities = [...new Set(PROPERTIES.map(p=>p.locality))].sort();
  localitySelect.innerHTML = `<option value="">All Localities</option>` +
    localities.map(l=>`<option value="${l}">${l}</option>`).join("");

  // preload from query string (from home page search)
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

    const results = PROPERTIES.filter(p=>{
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
function initDetailPage(){
  const root = document.getElementById("detail-root");
  if(!root) return;
  const id = qs("id");
  const p = PROPERTIES.find(x=>x.id === id) || PROPERTIES[0];

  document.title = `${p.project} — ${p.type} in ${p.locality} | Marine & Metro Realty`;

  document.getElementById("detail-facade").innerHTML = facadeSVG(p.facade);
  document.getElementById("detail-status-tag").textContent = p.status;
  document.getElementById("detail-title").textContent = p.project;
  document.getElementById("detail-location").textContent = p.location;
  document.getElementById("detail-price").textContent = p.priceLabel;

  document.getElementById("spec-type").textContent = p.type;
  document.getElementById("spec-area").textContent = `${p.area} sq.ft. carpet area`;
  document.getElementById("spec-floor").textContent = p.floor;
  document.getElementById("spec-facing").textContent = p.facing;
  document.getElementById("spec-possession").textContent = p.possession;
  document.getElementById("spec-connectivity").textContent = p.connectivity;

  document.getElementById("amenity-list").innerHTML =
    p.amenities.map(a=>`<li>${a}</li>`).join("");

  document.getElementById("rera-info").textContent = p.rera;

  const enquireBtn = document.getElementById("enquire-btn");
  if(enquireBtn) enquireBtn.href = `contact.html?property=${p.id}`;

  const visitBtn = document.getElementById("visit-btn");
  if(visitBtn) visitBtn.href = `contact.html?property=${p.id}&visit=1`;
}

// ================================================================
// ENQUIRY / CONTACT PAGE — form validation
// ================================================================
function initContactPage(){
  const form = document.getElementById("enquiry-form");
  if(!form) return;

  const propId = qs("property");
  const wantsVisit = qs("visit");
  if(propId){
    const p = PROPERTIES.find(x=>x.id === propId);
    if(p){
      const note = document.getElementById("prefill-note");
      if(note){
        note.style.display = "block";
        note.textContent = `Enquiring about: ${p.project}, ${p.type} in ${p.locality} (${p.priceLabel})`;
      }
      const hidden = document.getElementById("field-property");
      if(hidden) hidden.value = p.project;
      const msgField = document.getElementById("field-message");
      if(msgField && !msgField.value){
        msgField.value = wantsVisit
          ? `I would like to schedule a site visit for ${p.project}, ${p.locality}.`
          : `I am interested in ${p.project}, ${p.locality}. Please share more details.`;
      }
    }
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    let valid = true;

    const nameRow = document.getElementById("row-name");
    const nameInput = document.getElementById("field-name");
    if(nameInput.value.trim().length < 2){
      nameRow.classList.add("invalid"); valid = false;
    } else nameRow.classList.remove("invalid");

    const phoneRow = document.getElementById("row-phone");
    const phoneInput = document.getElementById("field-phone");
    const phoneDigits = phoneInput.value.replace(/\D/g,"");
    if(phoneDigits.length !== 10){
      phoneRow.classList.add("invalid"); valid = false;
    } else phoneRow.classList.remove("invalid");

    const emailRow = document.getElementById("row-email");
    const emailInput = document.getElementById("field-email");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(emailInput.value.trim() && !emailPattern.test(emailInput.value.trim())){
      emailRow.classList.add("invalid"); valid = false;
    } else emailRow.classList.remove("invalid");

    const msgRow = document.getElementById("row-message");
    const msgInput = document.getElementById("field-message");
    if(msgInput.value.trim().length < 5){
      msgRow.classList.add("invalid"); valid = false;
    } else msgRow.classList.remove("invalid");

    if(!valid) return;

    // No backend in current scope — simulate successful submission
    const banner = document.getElementById("success-banner");
    banner.classList.add("show");
    banner.textContent = "Thank you — your enquiry has been received. Our team will call you back shortly.";
    form.reset();
    window.scrollTo({top: banner.offsetTop - 100, behavior:"smooth"});
  });
}

// ================================================================
// INIT
// ================================================================
document.addEventListener("DOMContentLoaded", ()=>{
  setActiveNav();
  initNavToggle();
  initHomePage();
  initListingsPage();
  initDetailPage();
  initContactPage();
});
