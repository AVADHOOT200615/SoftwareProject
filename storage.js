// ================================================================
// STORAGE LAYER — wraps window.storage (persists across sessions)
// Properties + Enquiries + Users = SHARED (visible to all visitors)
// Session (who's currently logged in on this device) = PERSONAL
// ================================================================

const OWNER_CREDENTIALS = { username: "owner", password: "MarineMetro@2026" };

async function storageGet(key, shared){
  try{
    const res = await window.storage.get(key, shared);
    return res ? JSON.parse(res.value) : null;
  }catch(e){
    return null;
  }
}
async function storageSet(key, value, shared){
  try{
    await window.storage.set(key, JSON.stringify(value), shared);
    return true;
  }catch(e){
    console.error("Storage set failed", e);
    return false;
  }
}

// ---------------- PROPERTIES (shared) ----------------
async function getProperties(){
  let props = await storageGet("properties-all", true);
  if(!props){
    const seed = (typeof SEED_PROPERTIES !== "undefined") ? SEED_PROPERTIES : [];
    props = seed.map(p => ({ images: [], description: "", ...p }));
    await storageSet("properties-all", props, true);
  }
  return props;
}
async function saveProperties(list){
  return storageSet("properties-all", list, true);
}
async function getPropertyById(id){
  const list = await getProperties();
  return list.find(p => p.id === id) || null;
}
async function upsertProperty(prop){
  const list = await getProperties();
  const idx = list.findIndex(p => p.id === prop.id);
  if(idx >= 0) list[idx] = prop; else list.unshift(prop);
  await saveProperties(list);
  return list;
}
async function deleteProperty(id){
  const list = await getProperties();
  const filtered = list.filter(p => p.id !== id);
  await saveProperties(filtered);
  return filtered;
}
function nextPropertyId(list){
  const nums = list
    .map(p => parseInt((p.id||"").replace(/\D/g,""),10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return "P" + String(max+1).padStart(3,"0");
}

// ---------------- ENQUIRIES (shared) ----------------
async function getEnquiries(){
  const list = await storageGet("enquiries-all", true);
  return list || [];
}
async function addEnquiry(enq){
  const list = await getEnquiries();
  enq.id = "ENQ" + Date.now();
  enq.createdAt = new Date().toISOString();
  list.unshift(enq);
  await storageSet("enquiries-all", list, true);
  return enq;
}

// ---------------- USERS / CUSTOMER ACCOUNTS (shared) ----------------
async function getUsers(){
  const list = await storageGet("users-all", true);
  return list || [];
}
async function registerUser({name, email, phone, password}){
  const users = await getUsers();
  if(users.find(u => u.email.toLowerCase() === email.toLowerCase())){
    return { ok:false, error: "An account with this email already exists." };
  }
  users.push({name, email, phone, password});
  await storageSet("users-all", users, true);
  return { ok:true };
}
async function verifyUser(email, password){
  const users = await getUsers();
  const u = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  return u || null;
}

// ---------------- SESSION (personal — this device/account only) ----------------
async function getSession(){
  return storageGet("session", false);
}
async function setSession(session){
  return storageSet("session", session, false);
}
async function clearSession(){
  try{
    await window.storage.delete("session", false);
  }catch(e){ /* no-op if never set */ }
}
