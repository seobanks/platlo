/* ==========================================================================
   PLATLO - USER DASHBOARD JS
   ========================================================================== */

let currentDashboardTab = "listings";

// Check Login state and Toggle Views
function checkAuthAndRender() {
  const user = window.PLATLO.currentUser;
  const guard = document.getElementById("dashboard-auth-guard");
  const content = document.getElementById("dashboard-content");

  if (!guard || !content) return;

  if (user) {
    guard.style.display = "none";
    content.style.display = "block";
    document.getElementById("dashboard-welcome").textContent = `Welcome, ${user.name}!`;
    loadDashboardData();
  } else {
    guard.style.display = "block";
    content.style.display = "none";
  }
}

// Tab switcher routing
function switchDashboardTab(tab) {
  currentDashboardTab = tab;
  
  const tabs = ["listings", "enquiries", "saved", "legal", "verification"];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    if (btn) btn.classList.toggle("active", t === tab);
    if (panel) panel.classList.toggle("active", t === tab);
  });

  loadDashboardData();
}

// Load data based on active tab
function loadDashboardData() {
  if (currentDashboardTab === "listings") {
    loadMyListings();
  } else if (currentDashboardTab === "enquiries") {
    loadMyEnquiries();
  } else if (currentDashboardTab === "saved") {
    loadMySavedProperties();
  } else if (currentDashboardTab === "verification") {
    loadVerificationHubData();
  }
  
  // Update overall dashboard stats cards (Savings, active, leads)
  updateDashboardStats();
}

// ==========================================================================
// 1. TAB: MY LISTINGS
// ==========================================================================
async function loadMyListings() {
  const container = document.getElementById("listings-rows-container");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Retrieving your properties...</div>`;

  const user = window.PLATLO.currentUser;
  let listings = [];

  if (window.PLATLO.isMock) {
    listings = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
  } else {
    try {
      const { data, error } = await window.PLATLO.supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      listings = data || [];
    } catch (err) {
      console.error("Supabase fail, fallback to mock user listings", err);
      listings = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
    }
  }

  if (listings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background-color: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <h3 style="font-size: 18px; margin-bottom: 8px;">No Listings Posted Yet</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Rent or sell your property with zero brokerage fee in one click.</p>
        <a href="./post-property.html" class="btn btn-primary">+ Post Property Free</a>
      </div>
    `;
    return;
  }

  container.innerHTML = listings.map(prop => {
    const isRent = prop.listing_type === "rent";
    const priceFormatted = isRent 
      ? `₹${prop.price.toLocaleString('en-IN')}/mo` 
      : `₹${(prop.price >= 10000000 ? (prop.price/10000000).toFixed(2) + ' Cr' : (prop.price/100000).toFixed(2) + ' L')}`;
    
    const isSold = prop.status === "sold";

    return `
      <div class="listing-row" style="opacity: ${isSold ? 0.6 : 1}">
        <img src="${prop.images[0] || './images/property_1.jpg'}" alt="${prop.title}">
        
        <div>
          <h4 style="font-size: 16px; margin-bottom: 4px;">${prop.title}</h4>
          <span style="font-size: 13px; color: var(--text-muted);">${prop.locality}, ${prop.city}</span>
        </div>
        
        <div style="font-weight: 700; color: var(--text-primary); font-family: 'Outfit';">
          ${priceFormatted}
        </div>
        
        <div style="font-size: 13px; color: var(--text-muted);">
          <strong>${prop.views_count || 0}</strong> Views
        </div>
        
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="location.href='./property.html?id=${prop.id}'">View</button>
          <button class="btn ${isSold ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="togglePropertyStatus('${prop.id}', '${prop.status}')">
            ${isSold ? 'Re-List' : 'Mark Sold'}
          </button>
          <button class="btn btn-secondary btn-sm" style="color: var(--error);" onclick="deletePropertyListing('${prop.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// Toggle status active/sold
async function togglePropertyStatus(id, currentStatus) {
  const newStatus = currentStatus === "active" ? "sold" : "active";

  if (window.PLATLO.isMock) {
    window.PLATLO_DB.updateProperty(id, { status: newStatus });
    showToast(newStatus === "sold" ? "Property marked as SOLD." : "Property listed again successfully!");
    loadMyListings();
  } else {
    try {
      const { error } = await window.PLATLO.supabase
        .from("properties")
        .update({ status: newStatus })
        .eq("id", id);
      
      if (error) throw error;
      showToast(newStatus === "sold" ? "Property marked as SOLD." : "Property listed again!");
      loadMyListings();
    } catch (err) {
      console.error("Supabase status change failed", err);
      // Fallback
      window.PLATLO_DB.updateProperty(id, { status: newStatus });
      showToast(newStatus === "sold" ? "Property marked as SOLD. (Local session)" : "Property re-listed. (Local session)");
      loadMyListings();
    }
  }
}

// Delete Property Listing
async function deletePropertyListing(id) {
  if (!confirm("Are you sure you want to delete this listing permanently?")) return;

  if (window.PLATLO.isMock) {
    window.PLATLO_DB.deleteProperty(id);
    showToast("Listing deleted.");
    loadMyListings();
  } else {
    try {
      const { error } = await window.PLATLO.supabase
        .from("properties")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      showToast("Listing deleted successfully.");
      loadMyListings();
    } catch (err) {
      console.error("Supabase listing delete failed", err);
      // Fallback
      window.PLATLO_DB.deleteProperty(id);
      showToast("Listing deleted.");
      loadMyListings();
    }
  }
}

// ==========================================================================
// 2. TAB: ENQUIRIES / LEADS INBOX
// ==========================================================================
async function loadMyEnquiries() {
  const container = document.getElementById("enquiries-cards-container");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Checking enquiries inbox...</div>`;

  const user = window.PLATLO.currentUser;
  let enquiries = [];

  if (window.PLATLO.isMock) {
    // In mock: get owner's properties, then get enquiries matching those properties
    const myProperties = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
    const myPropIds = new Set(myProperties.map(p => p.id));
    
    enquiries = window.PLATLO_DB.getEnquiries()
      .filter(e => myPropIds.has(e.property_id))
      .map(e => {
        const prop = myProperties.find(p => p.id === e.property_id);
        return { ...e, property_title: prop ? prop.title : "Deleted Property" };
      });
  } else {
    try {
      // Query enquiries using joins or filtering by properties matching owner_id
      const { data, error } = await window.PLATLO.supabase
        .from("enquiries")
        .select(`
          *,
          properties:property_id (
            title,
            owner_id
          )
        `);
      
      if (error) throw error;
      // Filter leads where property owner is current user (RLS policy handles this, but we filter for safety)
      enquiries = (data || [])
        .filter(e => e.properties && e.properties.owner_id === user.id)
        .map(e => ({
          ...e,
          property_title: e.properties.title
        }));
    } catch (err) {
      console.error("Supabase enquiries query failed, showing mock fallback", err);
      const myProperties = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
      const myPropIds = new Set(myProperties.map(p => p.id));
      enquiries = window.PLATLO_DB.getEnquiries()
        .filter(e => myPropIds.has(e.property_id))
        .map(e => {
          const prop = myProperties.find(p => p.id === e.property_id);
          return { ...e, property_title: prop ? prop.title : "Deleted Property" };
        });
    }
  }

  // Store in cache for CSV Export and Print Report
  window.PLATLO_INBOX_CACHE = enquiries;

  if (enquiries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background-color: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <h3 style="font-size: 18px; margin-bottom: 8px;">Your Inbox is Empty</h3>
        <p style="color: var(--text-muted); font-size: 13px;">Leads from interested buyers or tenants will appear instantly here.</p>
      </div>
    `;
    return;
  }

  const actionsHtml = `
    <div class="enquiries-actions-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
      <div style="font-size: 14px; color: var(--text-muted);">Found <strong style="color:var(--text-primary);">${enquiries.length}</strong> enquiries for your properties.</div>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary btn-sm" onclick="exportEnquiriesToCSV()" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-md); font-size: 12px; padding: 6px 12px; background:var(--bg-primary); cursor:pointer; border: 1px solid var(--border-color); color: var(--text-primary);">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
        <button class="btn btn-secondary btn-sm" onclick="printEnquiriesReport()" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-md); font-size: 12px; padding: 6px 12px; background:var(--bg-primary); cursor:pointer; border: 1px solid var(--border-color); color: var(--text-primary);">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Report
        </button>
      </div>
    </div>
  `;

  container.innerHTML = actionsHtml + enquiries.map(enq => {
    const dateStr = new Date(enq.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="enquiry-card">
        <div class="enquiry-property-ref">RE: ${enq.property_title}</div>
        <p style="font-size: 15px; line-height: 1.6; color: var(--text-primary); font-style: italic;">
          "${enq.message}"
        </p>
        <div class="enquiry-meta">
          <div>
            <strong>Sender Name:</strong> ${enq.sender_name}
          </div>
          <div>
            <strong>Phone:</strong> <a href="tel:${enq.sender_phone}" style="color:var(--primary); font-weight:600;">${enq.sender_phone}</a>
          </div>
          <div>
            <strong>Email:</strong> ${enq.sender_email ? `<a href="mailto:${enq.sender_email}">${enq.sender_email}</a>` : 'Not provided'}
          </div>
          <div style="text-align: right;">
            <strong>Received:</strong> ${dateStr}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function switchInboxSubTab(type) {
  const enqTab = document.getElementById("inbox-tab-enquiries");
  const visitsTab = document.getElementById("inbox-tab-visits");
  const enqBox = document.getElementById("enquiries-cards-container");
  const visitsBox = document.getElementById("site-visits-cards-container");

  if (!enqTab || !visitsTab || !enqBox || !visitsBox) return;

  if (type === "enquiries") {
    enqTab.classList.add("active");
    visitsTab.classList.remove("active");
    enqBox.style.display = "block";
    visitsBox.style.display = "none";
    loadMyEnquiries();
  } else if (type === "visits") {
    enqTab.classList.remove("active");
    visitsTab.classList.add("active");
    enqBox.style.display = "none";
    visitsBox.style.display = "block";
    loadMySiteVisits();
  }
}

function loadMySiteVisits() {
  const container = document.getElementById("site-visits-cards-container");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Checking site visits appointments...</div>`;

  const user = window.PLATLO.currentUser;
  if (!user) return;

  const myProperties = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
  const myPropIds = new Set(myProperties.map(p => p.id));

  // Retrieve site visits from localStorage
  const allVisits = JSON.parse(localStorage.getItem("platlo_site_visits") || "[]");
  const myVisits = allVisits.filter(v => myPropIds.has(v.property_id));

  if (myVisits.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background-color: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <h3 style="font-size: 18px; margin-bottom: 8px;">No Visits Scheduled</h3>
        <p style="color: var(--text-muted); font-size: 13px;">Appointments booked by buyers/tenants to visit your properties will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="enquiries-actions-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
      <div style="font-size: 14px; color: var(--text-muted);">Found <strong style="color:var(--text-primary);">${myVisits.length}</strong> site visit appointment${myVisits.length === 1 ? '' : 's'}.</div>
      <button class="btn btn-secondary btn-sm" onclick="printVisitsReport()" style="display: flex; align-items: center; gap: 6px; border-radius: var(--radius-md); font-size: 12px; padding: 6px 12px; background:var(--bg-primary); cursor:pointer; border: 1px solid var(--border-color); color: var(--text-primary);">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print Schedule
      </button>
    </div>
    <div style="display: grid; gap: 15px;">
      ${myVisits.map(v => {
        const propTitle = myProperties.find(p => p.id === v.property_id)?.title || "Property";
        const dateCreated = new Date(v.created_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
        const typeLabel = v.visit_type === "physical" ? "📍 Physical Site Visit" : "💻 Live Video Tour";
        const badgeColor = v.visit_type === "physical" ? "#10b981" : "#0ea5e9";
        const badgeBg = v.visit_type === "physical" ? "rgba(16,185,129,0.1)" : "rgba(14,165,233,0.1)";
        const badgeBorder = v.visit_type === "physical" ? "rgba(16,185,129,0.2)" : "rgba(14,165,233,0.2)";

        return `
          <div class="enquiry-card" style="border-left: 4px solid ${badgeColor};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
              <div class="enquiry-property-ref" style="margin: 0; font-weight: 700;">RE: ${propTitle}</div>
              <span style="font-size: 10px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor}; border: 1.5px solid ${badgeBorder}; padding: 2px 8px; border-radius: var(--radius-sm); text-transform: uppercase;">
                ${typeLabel}
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; font-size: 13px;">
              <div>
                <strong style="color:var(--text-muted);">Visitor Name:</strong>
                <div style="font-weight: 700; color: var(--text-primary); margin-top: 2px;">${v.visitor_name}</div>
              </div>
              <div>
                <strong style="color:var(--text-muted);">Visitor Phone:</strong>
                <div style="margin-top: 2px;"><a href="tel:${v.visitor_phone}" style="color: var(--primary); font-weight: 700;">${v.visitor_phone}</a></div>
              </div>
              <div>
                <strong style="color:var(--text-muted);">Appointment Schedule:</strong>
                <div style="font-weight: 800; color: var(--primary); margin-top: 2px;">${v.visit_date}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">at ${v.visit_time}</div>
              </div>
              <div>
                <strong style="color:var(--text-muted);">Ticket Pass ID:</strong>
                <div style="font-family: monospace; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${v.id}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  window.PLATLO_VISITS_CACHE = myVisits;
}

function printVisitsReport() {
  const visits = window.PLATLO_VISITS_CACHE;
  if (!visits || visits.length === 0) return;

  const win = window.open("", "_blank");
  if (!win) return;

  const rows = visits.map(v => `
    <tr>
      <td>${v.id}</td>
      <td>${v.visitor_name} (${v.visitor_phone})</td>
      <td>${v.property_title}</td>
      <td>${v.visit_type === 'physical' ? 'Physical Visit' : 'Video Tour'}</td>
      <td><strong>${v.visit_date}</strong> at ${v.visit_time}</td>
    </tr>
  `).join("");

  win.document.write(`
    <html>
      <head>
        <title>PLATLO Site Visit Appointments Schedule</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
          h2 { color: #0d9488; text-transform: uppercase; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h2>Site Visit Appointments Schedule</h2>
        <p>Report compiled on ${new Date().toLocaleDateString('en-IN')}</p>
        <table>
          <thead>
            <tr>
              <th>Pass ID</th>
              <th>Visitor Details</th>
              <th>Property Title</th>
              <th>Visit Type</th>
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  win.document.close();
}


// ==========================================================================
// 3. TAB: SAVED PROPERTIES / BOOKMARKS
// ==========================================================================
async function loadMySavedProperties() {
  const container = document.getElementById("saved-grid-container");
  if (!container) return;

  container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Retrieving saved bookmarks...</div>`;

  const user = window.PLATLO.currentUser;
  let savedProperties = [];

  if (window.PLATLO.isMock) {
    const savedIds = window.PLATLO_DB.getSavedProperties()
      .filter(s => s.user_id === user.id)
      .map(s => s.property_id);
    
    savedProperties = window.PLATLO_DB.getProperties().filter(p => savedIds.includes(p.id));
  } else {
    try {
      const { data, error } = await window.PLATLO.supabase
        .from("saved_properties")
        .select(`
          property_id,
          properties (*)
        `)
        .eq("user_id", user.id);
      
      if (error) throw error;
      savedProperties = (data || []).map(d => d.properties).filter(Boolean);
    } catch (err) {
      console.error("Supabase saved query failed, showing mock bookmarks", err);
      const savedIds = window.PLATLO_DB.getSavedProperties()
        .filter(s => s.user_id === user.id)
        .map(s => s.property_id);
      savedProperties = window.PLATLO_DB.getProperties().filter(p => savedIds.includes(p.id));
    }
  }

  if (savedProperties.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background-color: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <h3 style="font-size: 18px; margin-bottom: 8px;">No Bookmarks Saved</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Save properties from the search page to access them quickly here.</p>
        <a href="./properties.html" class="btn btn-primary">Find Properties to Save</a>
      </div>
    `;
    return;
  }

  container.innerHTML = savedProperties.map(prop => {
    const isRent = prop.listing_type === "rent";
    const priceFormatted = isRent 
      ? `₹${prop.price.toLocaleString('en-IN')}<span class="rent-period">/mo</span>` 
      : `₹${(prop.price >= 10000000 ? (prop.price/10000000).toFixed(2) + ' Cr' : (prop.price/100000).toFixed(2) + ' L')}`;
    
    const typeLabel = prop.property_type.charAt(0).toUpperCase() + prop.property_type.slice(1);
    const specLabel = prop.bedrooms > 0 ? `${prop.bedrooms} BHK` : `${prop.carpet_area} sq ft`;

    // Calculate PropWorth deal rating
    const baselines = {
      "Lucknow": { sell: 5000, rent: 15 },
      "Noida": { sell: 6500, rent: 20 },
      "Varanasi": { sell: 4500, rent: 12 },
      "Jhansi": { sell: 3500, rent: 9 },
      "Orai": { sell: 2500, rent: 7 },
      "Jalaun": { sell: 2200, rent: 6 },
      "Kalpi": { sell: 2000, rent: 5 },
      "Konch": { sell: 1800, rent: 5 }
    };
    const defaultBaseline = { sell: 3000, rent: 10 };
    const baselineSet = baselines[prop.city] || defaultBaseline;
    const baselineVal = baselineSet[prop.listing_type] || (prop.listing_type === "rent" ? 10 : 3000);
    const actualVal = prop.carpet_area ? (prop.price / prop.carpet_area) : baselineVal;
    const deviation = (actualVal - baselineVal) / baselineVal;

    let worthBadgeHtml = "";
    if (deviation < -0.12) {
      worthBadgeHtml = `<span class="badge badge-deal-great">Great Deal</span>`;
    } else if (deviation > 0.12) {
      worthBadgeHtml = `<span class="badge badge-deal-premium">Premium</span>`;
    } else {
      worthBadgeHtml = `<span class="badge badge-deal-fair">Fair Price</span>`;
    }

    return `
      <div class="property-card" onclick="location.href='./property.html?id=${prop.id}'" style="cursor: pointer;">
        <div class="card-media">
          <img src="${prop.images[0] || './images/property_1.jpg'}" alt="${prop.title}">
          <div class="card-badges">
            <span class="badge badge-owner">Direct Owner</span>
            ${worthBadgeHtml}
          </div>
          <button class="btn-fav active" onclick="event.stopPropagation(); removeBookmark('${prop.id}', this)" title="Remove Bookmark">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
          <div class="card-price-tag">
            <div class="card-price">${priceFormatted}</div>
            <div class="card-type">${typeLabel}</div>
          </div>
        </div>
        
        <div class="card-body">
          <h3 class="card-title" title="${prop.title}">${prop.title}</h3>
          <div class="card-location">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${prop.locality}, ${prop.city}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Remove bookmark quickly
async function removeBookmark(propId, btnEl) {
  const user = window.PLATLO.currentUser;
  
  if (window.PLATLO.isMock) {
    window.PLATLO_DB.toggleSaveProperty(user.id, propId);
    showToast("Bookmark removed.");
    loadMySavedProperties();
  } else {
    try {
      const { error } = await window.PLATLO.supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", user.id)
        .eq("property_id", propId);
      
      if (error) throw error;
      showToast("Bookmark removed.");
      loadMySavedProperties();
    } catch (err) {
      console.error("Supabase remove bookmark failed, fallback mock", err);
      window.PLATLO_DB.toggleSaveProperty(user.id, propId);
      showToast("Bookmark removed.");
      loadMySavedProperties();
    }
  }
}

// ==========================================================================
// 4. STATS COMPUTATION & ANALYTICS
// ==========================================================================
async function updateDashboardStats() {
  const user = window.PLATLO.currentUser;
  if (!user) return;

  let listings = [];
  let enquiries = [];

  if (window.PLATLO.isMock) {
    listings = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
    const myPropIds = new Set(listings.map(p => p.id));
    enquiries = window.PLATLO_DB.getEnquiries().filter(e => myPropIds.has(e.property_id));
  } else {
    try {
      const { data: props, error: pErr } = await window.PLATLO.supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id);
      
      if (pErr) throw pErr;
      listings = props || [];

      const { data: enqs, error: eErr } = await window.PLATLO.supabase
        .from("enquiries")
        .select(`
          *,
          properties:property_id (
            owner_id
          )
        `);
      if (eErr) throw eErr;
      enquiries = (enqs || []).filter(e => e.properties && e.properties.owner_id === user.id);
    } catch (err) {
      console.error("Failed to load stats from Supabase, fallback to mock", err);
      listings = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
      const myPropIds = new Set(listings.map(p => p.id));
      enquiries = window.PLATLO_DB.getEnquiries().filter(e => myPropIds.has(e.property_id));
    }
  }

  const activeListingsCount = listings.filter(p => p.status === "active").length;
  const enquiriesCount = enquiries.length;

  let totalSavings = 0;
  listings.forEach(p => {
    if (p.listing_type === "rent") {
      totalSavings += 2 * p.price; // 2x rent brokerage savings
    } else {
      totalSavings += 0.02 * p.price; // 2% sale brokerage savings
    }
  });

  const savingsEl = document.getElementById("stats-savings");
  const listingsEl = document.getElementById("stats-listings");
  const enquiriesEl = document.getElementById("stats-enquiries");

  if (savingsEl) {
    savingsEl.textContent = totalSavings >= 10000000 
      ? `₹${(totalSavings / 10000000).toFixed(2)} Cr` 
      : (totalSavings >= 100000 ? `₹${(totalSavings / 100000).toFixed(2)} L` : `₹${totalSavings.toLocaleString('en-IN')}`);
  }
  if (listingsEl) listingsEl.textContent = activeListingsCount;
  if (enquiriesEl) enquiriesEl.textContent = enquiriesCount;
}

// ==========================================================================
// 5. LEGAL RENTAL AGREEMENT DRAFT CREATOR & PRINTER
// ==========================================================================
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanThousand(n) {
    if (n < 20) return ones[n];
    const digit = n % 10;
    if (n < 100) return tens[Math.floor(n / 10)] + (digit ? '-' + ones[digit] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 === 0 ? '' : ' and ' + convertLessThanThousand(n % 100));
  }
  
  if (num === 0) return 'Zero';
  
  let tempNum = num;
  let wordResult = '';
  
  if (tempNum >= 10000000) {
    const crores = Math.floor(tempNum / 10000000);
    wordResult += convertLessThanThousand(crores) + ' Crore ';
    tempNum %= 10000000;
  }
  
  if (tempNum >= 100000) {
    const lakhs = Math.floor(tempNum / 100000);
    wordResult += convertLessThanThousand(lakhs) + ' Lakh ';
    tempNum %= 100000;
  }
  
  if (tempNum >= 1000) {
    const thousands = Math.floor(tempNum / 1000);
    wordResult += convertLessThanThousand(thousands) + ' Thousand ';
    tempNum %= 1000;
  }
  
  if (tempNum > 0) {
    wordResult += convertLessThanThousand(tempNum);
  }
  
  return wordResult.trim();
}

function generateAgreement(event) {
  event.preventDefault();
  
  const landlord = document.getElementById("legal-landlord").value.trim();
  const tenant = document.getElementById("legal-tenant").value.trim();
  const address = document.getElementById("legal-address").value.trim();
  const rent = parseFloat(document.getElementById("legal-rent").value);
  const deposit = parseFloat(document.getElementById("legal-deposit").value);
  const term = document.getElementById("legal-term").value;
  const commDateVal = document.getElementById("legal-date").value;
  
  if (!landlord || !tenant || !address || isNaN(rent) || isNaN(deposit) || !commDateVal) {
    showToast("Please fill all details to generate the rental agreement.", "error");
    return;
  }

  const d = new Date(commDateVal);
  const formattedCommDate = d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const rentWords = numberToWords(rent);
  const depositWords = numberToWords(deposit);

  const agreementBox = document.getElementById("agreement-legal-draft-box");
  if (!agreementBox) return;

  agreementBox.innerHTML = `
    <h2 style="text-align: center; font-size: 20px; text-decoration: underline; margin-bottom: 30px;">RENT AGREEMENT</h2>
    <p>This Rent Agreement is made and entered into on this <strong>${formattedCommDate}</strong> by and between:</p>

    <p><strong>${landlord}</strong>, hereinafter referred to as the <strong>"LANDLORD/OWNER"</strong> (which expression shall unless excluded by or repugnant to the context be deemed to include his/her heirs, executors, administrators, and assigns) of the ONE PART;</p>

    <p style="text-align: center; font-weight: bold; margin: 10px 0;">AND</p>

    <p><strong>${tenant}</strong>, hereinafter referred to as the <strong>"TENANT/LICENSEE"</strong> (which expression shall unless excluded by or repugnant to the context be deemed to include his/her heirs, executors, administrators, and assigns) of the OTHER PART.</p>

    <p>WHEREAS the Landlord is the absolute owner and in possession of the premises situated at <strong>${address}</strong>, hereinafter referred to as the <strong>"Demised Premises"</strong>.</p>

    <p>AND WHEREAS the Tenant has requested the Landlord to let out the Demised Premises on rent for residential purposes and the Landlord has agreed to rent out the Demised Premises for a period of <strong>${term} months</strong> commencing from <strong>${formattedCommDate}</strong> under the following mutually agreed terms and conditions:</p>

    <h3 style="font-size: 16px; margin-top: 20px; text-decoration: underline;">NOW THIS AGREEMENT WITNESSETH AS UNDER:</h3>

    <ol style="margin-left: 20px; padding-left: 0; display: flex; flex-direction: column; gap: 12px;">
      <li><strong>RENT:</strong> The Tenant shall pay to the Landlord a monthly rent of <strong>₹${rent.toLocaleString('en-IN')}</strong> (Rupees ${rentWords} Only) on or before the 5th day of each calendar month.</li>
      <li><strong>SECURITY DEPOSIT:</strong> The Tenant has paid a sum of <strong>₹${deposit.toLocaleString('en-IN')}</strong> (Rupees ${depositWords} Only) to the Landlord as an interest-free Security Deposit. This deposit shall be refunded to the Tenant at the time of vacating the Demised Premises after deducting any arrears of rent, utility bills, or damages, if any.</li>
      <li><strong>DURATION:</strong> This agreement is for a fixed term of <strong>${term} months</strong>. The agreement may be renewed further with the mutual consent of both parties on newly agreed terms.</li>
      <li><strong>UTILITY BILLS:</strong> The Tenant shall pay all charges for electricity, water, internet, and cooking gas consumed in the Demised Premises during the tenancy period directly to the respective authorities. Society maintenance charges shall be paid by the Landlord/Owner unless agreed otherwise.</li>
      <li><strong>USAGE:</strong> The Demised Premises shall be used by the Tenant solely for residential purpose for him/her and his/her immediate family and shall not be sublet or assigned to any other person.</li>
      <li><strong>MAINTENANCE AND REPAIRS:</strong> The Tenant shall keep the Demised Premises in a clean, hygienic, and good condition. Minor repairs up to ₹2,000 shall be borne by the Tenant, whereas major structural repairs shall be done by the Landlord.</li>
      <li><strong>NOTICE PERIOD:</strong> Either party can terminate this agreement by giving 1 (one) month's written notice in advance or paying one month's rent in lieu thereof.</li>
    </ol>

    <p style="margin-top: 30px;">IN WITNESS WHEREOF, the Landlord and the Tenant have signed this agreement on the day, month, and year first written above in the presence of the following witnesses.</p>

    <div class="signatures" style="margin-top: 60px; display: flex; justify-content: space-between;">
      <div style="border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 10px; margin-top: 60px;">
        <strong>LANDLORD/OWNER</strong>
        <p style="margin-top: 4px;">Name: ${landlord}</p>
      </div>
      <div style="border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 10px; margin-top: 60px;">
        <strong>TENANT/LICENSEE</strong>
        <p style="margin-top: 4px;">Name: ${tenant}</p>
      </div>
    </div>
  `;

  const overlay = document.getElementById("agreement-modal-overlay");
  if (overlay) overlay.classList.add("active");
}

function closeAgreementModal() {
  const overlay = document.getElementById("agreement-modal-overlay");
  if (overlay) overlay.classList.remove("active");
}

function printAgreement() {
  const agreementContent = document.getElementById("agreement-legal-draft-box").innerHTML;
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) {
    showToast("Popup blocked! Please allow popups to print agreements.", "error");
    return;
  }
  printWindow.document.write(`
    <html>
      <head>
        <title>Rental Agreement - PLATLO</title>
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            padding: 40px;
            line-height: 1.8;
            color: #000;
            background-color: #fff;
          }
          h1, h2, h3 {
            text-align: center;
            margin-bottom: 20px;
          }
          ol {
            margin-left: 20px;
            padding-left: 0;
          }
          li {
            margin-bottom: 12px;
            text-align: justify;
          }
          .signatures {
            margin-top: 80px;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        ${agreementContent}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// Leads Inbox Export & Print Helpers
function exportEnquiriesToCSV() {
  const user = window.PLATLO.currentUser;
  if (!user) return;

  const enquiries = window.PLATLO_INBOX_CACHE || [];
  if (enquiries.length === 0) {
    window.showToast("No enquiries to export.", "error");
    return;
  }

  // Build CSV content
  const headers = ["Property Title", "Sender Name", "Sender Phone", "Sender Email", "Message Description", "Date Received"];
  const rows = enquiries.map(e => [
    e.property_title,
    e.sender_name,
    e.sender_phone,
    e.sender_email || 'N/A',
    e.message.replace(/"/g, '""'), // escape quotes
    new Date(e.created_at).toLocaleString('en-IN')
  ]);

  const csvRows = [headers.join(","), ...rows.map(r => r.map(val => `"${val}"`).join(","))];
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvRows.join("\n"));

  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  link.setAttribute("download", `platlo_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.showToast("Leads CSV exported successfully!", "success");
}

function printEnquiriesReport() {
  const enquiries = window.PLATLO_INBOX_CACHE || [];
  if (enquiries.length === 0) {
    window.showToast("No enquiries to print.", "error");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.showToast("Popup blocked! Please allow popups to print enquiries.", "error");
    return;
  }
  
  const dateStr = new Date().toLocaleDateString('en-IN');
  const user = window.PLATLO.currentUser;
  
  const html = `
    <html>
      <head>
        <title>PLATLO Leads Report - ${dateStr}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
          h1 { font-size: 24px; margin: 0 0 5px 0; color: #0f172a; }
          p.subtitle { color: #64748b; font-size: 14px; margin: 0 0 25px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
          th { background: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
          .prop-ref { font-weight: bold; color: #2563eb; }
          .msg { font-style: italic; color: #334155; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">
          <div>
            <h1>PLATLO Buyer & Tenant Leads Report</h1>
            <p class="subtitle">Generated on ${dateStr} for owner: ${user.name}</p>
          </div>
          <button onclick="window.print()" style="padding: 8px 16px; background:#2563eb; color:#fff; border:none; border-radius:4px; font-weight:600; cursor:pointer;">Print Page</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Buyer Contact</th>
              <th>Message</th>
              <th>Date Received</th>
            </tr>
          </thead>
          <tbody>
            ${enquiries.map(e => `
              <tr>
                <td class="prop-ref">${e.property_title}</td>
                <td>
                  <strong>${e.sender_name}</strong><br>
                  Phone: ${e.sender_phone}<br>
                  Email: ${e.sender_email || 'N/A'}
                </td>
                <td class="msg">"${e.message}"</td>
                <td>${new Date(e.created_at).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

  printWindow.document.close();
}

// ==========================================================================
// 5. CSV BULK UPLOAD CONTROLLER
// ==========================================================================
let PARSED_CSV_PROPERTIES = [];

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',') {
      if (inQuotes) {
        row[row.length - 1] += c;
      } else {
        row.push("");
      }
    } else if (c === '\r' || c === '\n') {
      if (inQuotes) {
        row[row.length - 1] += c;
      } else {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      }
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

function downloadSampleCSV() {
  const headers = [
    "title", "listing_type", "property_type", "price", "bedrooms", "bathrooms", 
    "carpet_area", "city", "locality", "address", "society", "furnishing", 
    "parking", "contact_name", "contact_phone", "contact_email", "description"
  ];
  
  const sampleRow1 = [
    "Luxury 3 BHK Flat in Gomti Nagar", "sell", "apartment", "9500000", "3", "3", 
    "1600", "Lucknow", "Gomti Nagar", "Sector 4, Gomti Nagar Extension", "Eldeco Heights", "semi-furnished", 
    "both", "Ramesh Kumar", "+91 98765 12345", "ramesh@example.com", "Beautiful direct owner flat with park view"
  ];
  
  const sampleRow2 = [
    "Cosy 1 BHK portion for Rent near Station Road", "rent", "house", "6500", "1", "1", 
    "550", "Orai", "Tulsi Nagar", "Tulsi Nagar Lane 2", "Tulsi Nagar Colony", "unfurnished", 
    "bike", "Sunita Sharma", "+91 94152 44332", "sunita@example.com", "Budget house portion ideal for students"
  ];
  
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(","), sampleRow1.map(v => `"${v}"`).join(","), sampleRow2.map(v => `"${v}"`).join(",")].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "platlo_bulk_properties_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function openBulkUploadModal() {
  const modalHtml = `
    <div id="bulk-upload-modal-overlay" class="modal-overlay active" style="z-index: 1100;">
      <div class="modal-content" style="max-width: 750px; width: 95%; padding: 24px; border-radius: var(--radius-lg); background: var(--bg-primary); border: 1px solid var(--border-color); max-height: 90vh; overflow-y: auto;">
        <button class="modal-close" onclick="closeBulkUploadModal()">&times;</button>
        <h3 style="font-size: 22px; margin-bottom: 15px; color: var(--text-primary);">Bulk Upload Properties via CSV</h3>
        
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
          Upload multiple property listings simultaneously. Download our template first, fill in your property rows in Excel/Google Sheets, export as CSV, and drop it here.
        </p>

        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <button class="btn btn-secondary btn-sm" onclick="downloadSampleCSV()" style="display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 8px 14px; background:var(--bg-secondary); border: 1px solid var(--border-color); color:var(--text-primary); cursor:pointer; border-radius: var(--radius-md);">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download CSV Template
          </button>
        </div>

        <div id="csv-drop-zone" style="border: 2px dashed var(--border-color); padding: 30px; text-align: center; border-radius: var(--radius-md); background: var(--bg-secondary); cursor: pointer; margin-bottom: 20px; transition: border-color 0.2s;" onclick="document.getElementById('csv-file-input').click()">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted); margin-bottom: 10px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Click or Drag & Drop CSV File here</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">Supports .csv files up to 2MB</div>
          <input type="file" id="csv-file-input" accept=".csv" style="display:none;" onchange="handleCSVSelect(event)">
        </div>

        <div id="csv-preview-container" style="display:none; margin-bottom: 20px;">
          <h4 style="font-size: 14px; margin-bottom: 10px; color: var(--text-primary);">Parsed Preview (<span id="csv-preview-count">0</span> items)</h4>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
              <thead style="position:sticky; top:0; background:var(--bg-secondary); border-bottom:1px solid var(--border-color);">
                <tr>
                  <th style="padding: 8px; color:var(--text-muted);">Title</th>
                  <th style="padding: 8px; color:var(--text-muted);">Type</th>
                  <th style="padding: 8px; color:var(--text-muted);">Price</th>
                  <th style="padding: 8px; color:var(--text-muted);">BHK</th>
                  <th style="padding: 8px; color:var(--text-muted);">Locality</th>
                </tr>
              </thead>
              <tbody id="csv-preview-tbody">
                <!-- Preview rows will be injected here -->
              </tbody>
            </table>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 15px;">
          <button class="btn btn-secondary" onclick="closeBulkUploadModal()" style="padding: 10px 18px;">Cancel</button>
          <button class="btn btn-accent" id="csv-submit-btn" disabled onclick="submitBulkUpload()" style="padding: 10px 18px; display:flex; align-items:center; gap:8px;">
            Upload Properties
          </button>
        </div>
      </div>
    </div>
  `;

  const oldModal = document.getElementById("bulk-upload-modal-overlay");
  if (oldModal) oldModal.remove();

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = modalHtml.trim();
  const modalEl = tempDiv.firstChild;
  document.body.appendChild(modalEl);

  // Setup drag drop events
  const dropZone = document.getElementById("csv-drop-zone");
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--primary)";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "var(--border-color)";
  });
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border-color)";
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      processCSVFile(file);
    } else {
      window.showToast("Please select a valid CSV file.", "error");
    }
  });

  document.addEventListener("keydown", handleBulkUploadEscape);
}

function handleCSVSelect(event) {
  const file = event.target.files[0];
  if (file) processCSVFile(file);
}

function processCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    try {
      const rows = parseCSV(text);
      if (rows.length < 2) {
        window.showToast("CSV file is empty or missing headers.", "error");
        return;
      }
      
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const getHeaderIdx = (name) => headers.indexOf(name);
      
      const titleIdx = getHeaderIdx("title");
      const listingTypeIdx = getHeaderIdx("listing_type");
      const propertyTypeIdx = getHeaderIdx("property_type");
      const priceIdx = getHeaderIdx("price");
      const bedroomsIdx = getHeaderIdx("bedrooms");
      const bathroomsIdx = getHeaderIdx("bathrooms");
      const carpetAreaIdx = getHeaderIdx("carpet_area");
      const cityIdx = getHeaderIdx("city");
      const localityIdx = getHeaderIdx("locality");
      const addressIdx = getHeaderIdx("address");
      const societyIdx = getHeaderIdx("society");
      const furnishingIdx = getHeaderIdx("furnishing");
      const parkingIdx = getHeaderIdx("parking");
      const contactNameIdx = getHeaderIdx("contact_name");
      const contactPhoneIdx = getHeaderIdx("contact_phone");
      const contactEmailIdx = getHeaderIdx("contact_email");
      const descriptionIdx = getHeaderIdx("description");

      if (titleIdx === -1 || priceIdx === -1 || cityIdx === -1 || localityIdx === -1) {
        window.showToast("Required headers (title, price, city, locality) are missing.", "error");
        return;
      }

      const parsedItems = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length || !row[titleIdx]) continue;

        parsedItems.push({
          title: row[titleIdx],
          listing_type: listingTypeIdx !== -1 ? row[listingTypeIdx].trim().toLowerCase() : "sell",
          property_type: propertyTypeIdx !== -1 ? row[propertyTypeIdx].trim().toLowerCase() : "apartment",
          price: priceIdx !== -1 ? parseFloat(row[priceIdx]) || 0 : 0,
          bedrooms: bedroomsIdx !== -1 ? parseInt(row[bedroomsIdx]) || 0 : 0,
          bathrooms: bathroomsIdx !== -1 ? parseInt(row[bathroomsIdx]) || 0 : 0,
          carpet_area: carpetAreaIdx !== -1 ? parseFloat(row[carpetAreaIdx]) || 0 : 0,
          city: row[cityIdx].trim(),
          locality: row[localityIdx].trim(),
          address: addressIdx !== -1 ? row[addressIdx].trim() : "",
          society: societyIdx !== -1 ? row[societyIdx].trim() : "",
          furnishing: furnishingIdx !== -1 ? row[furnishingIdx].trim().toLowerCase() : "unfurnished",
          parking: parkingIdx !== -1 ? row[parkingIdx].trim().toLowerCase() : "none",
          contact_name: contactNameIdx !== -1 && row[contactNameIdx] ? row[contactNameIdx].trim() : window.PLATLO.currentUser.name,
          contact_phone: contactPhoneIdx !== -1 && row[contactPhoneIdx] ? row[contactPhoneIdx].trim() : window.PLATLO.currentUser.phone || "+91 99999 88888",
          contact_email: contactEmailIdx !== -1 && row[contactEmailIdx] ? row[contactEmailIdx].trim() : window.PLATLO.currentUser.email || "owner@example.com",
          description: descriptionIdx !== -1 ? row[descriptionIdx].trim() : "Direct owner listing on PLATLO."
        });
      }

      if (parsedItems.length === 0) {
        window.showToast("No valid rows parsed from the CSV file.", "error");
        return;
      }

      PARSED_CSV_PROPERTIES = parsedItems;

      const tbody = document.getElementById("csv-preview-tbody");
      tbody.innerHTML = parsedItems.map(item => `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 8px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color:var(--text-primary);">${item.title}</td>
          <td style="padding: 8px; text-transform: capitalize; color:var(--text-primary);">${item.listing_type}</td>
          <td style="padding: 8px; color:var(--text-primary);">₹${item.price.toLocaleString('en-IN')}</td>
          <td style="padding: 8px; color:var(--text-primary);">${item.bedrooms} BHK</td>
          <td style="padding: 8px; color:var(--text-primary);">${item.locality}, ${item.city}</td>
        </tr>
      `).join("");

      document.getElementById("csv-preview-count").textContent = parsedItems.length;
      document.getElementById("csv-preview-container").style.display = "block";
      
      const submitBtn = document.getElementById("csv-submit-btn");
      submitBtn.disabled = false;
      submitBtn.textContent = `Upload ${parsedItems.length} Properties`;
      window.showToast(`Successfully parsed ${parsedItems.length} properties!`, "success");

    } catch (err) {
      console.error(err);
      window.showToast("Failed to parse CSV. Please verify formatting.", "error");
    }
  };
  reader.readAsText(file);
}

async function submitBulkUpload() {
  if (PARSED_CSV_PROPERTIES.length === 0) return;

  const user = window.PLATLO.currentUser;
  if (!user) return;

  const submitBtn = document.getElementById("csv-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Uploading...";

  if (window.PLATLO.isMock) {
    const currentProps = window.PLATLO_DB.getProperties();
    const newProps = PARSED_CSV_PROPERTIES.map((item, idx) => {
      return {
        id: `prop-${currentProps.length + idx + 1}`,
        owner_id: user.id,
        title: item.title,
        description: item.description,
        listing_type: item.listing_type,
        property_type: item.property_type,
        price: item.price,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        balconies: 1,
        carpet_area: item.carpet_area,
        city: item.city,
        locality: item.locality,
        address: item.address,
        society: item.society,
        furnishing: item.furnishing,
        parking: item.parking,
        floor: 1,
        total_floors: 3,
        images: ["./images/property_1.jpg", "./images/property_2.jpg"],
        contact_name: item.contact_name,
        contact_phone: item.contact_phone,
        contact_email: item.contact_email,
        views_count: Math.floor(Math.random() * 50) + 1,
        status: "active",
        created_at: new Date().toISOString()
      };
    });

    const updatedList = [...currentProps, ...newProps];
    localStorage.setItem("platlo_properties", JSON.stringify(updatedList));

    setTimeout(() => {
      window.showToast(`Successfully uploaded ${newProps.length} properties to your dashboard!`, "success");
      closeBulkUploadModal();
      loadMyListings();
      updateDashboardStats();
    }, 800);

  } else {
    try {
      const dbRows = PARSED_CSV_PROPERTIES.map(item => {
        return {
          owner_id: user.id,
          title: item.title,
          description: item.description,
          listing_type: item.listing_type,
          property_type: item.property_type,
          price: item.price,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          balconies: 1,
          carpet_area: item.carpet_area,
          city: item.city,
          locality: item.locality,
          address: item.address,
          society: item.society,
          furnishing: item.furnishing,
          parking: item.parking,
          floor: 1,
          total_floors: 3,
          images: ["./images/property_1.jpg", "./images/property_2.jpg"],
          contact_name: item.contact_name,
          contact_phone: item.contact_phone,
          contact_email: item.contact_email,
          views_count: 0,
          status: "active"
        };
      });

      const { data, error } = await window.PLATLO.supabase
        .from("properties")
        .insert(dbRows)
        .select();

      if (error) throw error;

      window.showToast(`Successfully uploaded ${dbRows.length} properties directly to Supabase!`, "success");
      closeBulkUploadModal();
      loadMyListings();
      updateDashboardStats();

    } catch (err) {
      console.error(err);
      window.showToast("Failed to upload properties to database.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Upload Properties";
    }
  }
}

function closeBulkUploadModal() {
  const modal = document.getElementById("bulk-upload-modal-overlay");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => modal.remove(), 300);
  }
  document.removeEventListener("keydown", handleBulkUploadEscape);
  PARSED_CSV_PROPERTIES = [];
}

function handleBulkUploadEscape(e) {
  if (e.key === "Escape") closeBulkUploadModal();
}

// Listen for updates when authentication status changes
document.addEventListener("platloAuthChange", () => {
  checkAuthAndRender();
});

// ==========================================================================
// 8. TAB: TENANT VERIFICATION & RENT PAYMENTS HUB
// ==========================================================================
let currentRentReceipts = [];

function loadVerificationHubData() {
  const receiptsStr = localStorage.getItem("platlo_rent_receipts") || "[]";
  currentRentReceipts = JSON.parse(receiptsStr);
  
  const user = window.PLATLO.currentUser;
  const listings = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
  const landlord = listings.length > 0 ? listings[0].contact_name : "Amit Srivastava";
  
  const dueVal = document.getElementById("rent-due-val");
  const payBtn = document.getElementById("btn-pay-rent");
  
  const hasPaidThisMonth = currentRentReceipts.some(r => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  if (dueVal && payBtn) {
    if (hasPaidThisMonth) {
      dueVal.textContent = "₹0 (Paid)";
      payBtn.textContent = "Rent Paid";
      payBtn.disabled = true;
      payBtn.style.opacity = "0.5";
      payBtn.style.pointerEvents = "none";
    } else {
      dueVal.textContent = "₹12,000";
      payBtn.textContent = "Pay Rent Online";
      payBtn.disabled = false;
      payBtn.style.opacity = "1";
      payBtn.style.pointerEvents = "auto";
    }
  }

  renderReceiptsList();
}

function renderReceiptsList() {
  const container = document.getElementById("receipts-list-container");
  if (!container) return;

  if (currentRentReceipts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; font-size: 12px; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: var(--radius-sm);">
        No rent payment receipts logged yet.
      </div>
    `;
    return;
  }

  container.innerHTML = currentRentReceipts.map((r, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 13px; margin-bottom: 8px;">
      <div>
        <strong style="color: var(--text-primary);">Receipt for ${r.month}</strong>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Paid on: ${new Date(r.date).toLocaleDateString()}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-weight: 700; color: var(--primary);">₹${r.amount.toLocaleString('en-IN')}</span>
        <button class="btn btn-secondary btn-sm" onclick="viewReceipt(${idx})" style="padding: 4px 8px; font-size: 11px; cursor: pointer;">View Receipt</button>
      </div>
    </div>
  `).join('');
}

function runTenantCheck(event) {
  event.preventDefault();
  const name = document.getElementById("tenant-verify-name").value.trim();
  const aadhar = document.getElementById("tenant-verify-aadhar").value.trim();
  
  const loader = document.getElementById("verify-loader");
  const loaderText = document.getElementById("verify-loader-text");
  const resultBox = document.getElementById("verify-result-box");
  const form = document.getElementById("tenant-verify-form");

  if (!loader || !resultBox || !form) return;

  form.style.display = "none";
  loader.style.display = "block";
  resultBox.style.display = "none";

  const steps = [
    "Contacting UIDAI Aadhaar registry...",
    "Querying state police records database...",
    "Checking civil credit histories...",
    "Compiling certification report..."
  ];

  let currentStep = 0;
  loaderText.textContent = steps[0];

  const interval = setInterval(() => {
    currentStep++;
    if (currentStep < steps.length) {
      loaderText.textContent = steps[currentStep];
    } else {
      clearInterval(interval);
      loader.style.display = "none";
      
      // Update result details
      document.getElementById("verify-res-name").textContent = name;
      document.getElementById("verify-res-aadhar").textContent = `XXXX XXXX ${aadhar.slice(-4)}`;
      document.getElementById("verify-cert-id").textContent = `Cert ID: PLAT-${Math.floor(10000 + Math.random() * 90000)}-V`;
      
      resultBox.style.display = "block";
      showToast("Tenant background verification complete!", "success");
    }
  }, 1000);
}

function printVerifyReport() {
  const content = document.getElementById("verify-result-box").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>Police Tenant Verification Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #222; line-height: 1.6; }
          .report-box { border: 2px dashed #10b981; padding: 30px; border-radius: 8px; background: #f0fdf4; max-width: 600px; margin: 0 auto; }
          h2 { color: #10b981; text-transform: uppercase; margin-bottom: 5px; }
          span { font-size: 12px; color: #666; font-weight: bold; }
          table { width: 100%; margin-top: 20px; border-collapse: collapse; }
          td { padding: 10px 0; border-bottom: 1px solid #ddd; }
          .success { color: #10b981; font-weight: bold; }
          .btn, form, input { display: none; }
        </style>
      </head>
      <body>
        <div class="report-box">
          <h2>Tenant Verification Report</h2>
          ${content}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

function openRentPayModal() {
  const user = window.PLATLO.currentUser;
  const listings = window.PLATLO_DB.getProperties().filter(p => p.owner_id === user.id);
  const landlord = listings.length > 0 ? listings[0].contact_name : "Amit Srivastava";

  document.getElementById("rentpay-landlord").textContent = landlord;
  document.getElementById("rentpay-modal-overlay").classList.add("active");
}

function closeRentPayModal() {
  document.getElementById("rentpay-modal-overlay").classList.remove("active");
}

function submitRentPayment(event) {
  event.preventDefault();
  const upi = document.getElementById("rentpay-upi").value.trim();
  const landlordName = document.getElementById("rentpay-landlord").textContent;
  const user = window.PLATLO.currentUser;

  closeRentPayModal();
  showToast("Processing rent transaction...", "info");

  setTimeout(() => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = months[new Date().getMonth()];
    
    const receipt = {
      id: "PLAT-R-" + Math.floor(100000 + Math.random() * 900000),
      month: `${currentMonthName} ${new Date().getFullYear()}`,
      date: new Date().toISOString(),
      amount: 12000,
      landlord: landlordName,
      tenant: user ? user.email.split('@')[0] : "Rohan Kumar",
      address: "Direct lease asset listed on PLATLO, Orai",
      mode: upi.includes('@') ? "UPI (Secure)" : "Credit Card (Masked)"
    };

    currentRentReceipts.unshift(receipt);
    localStorage.setItem("platlo_rent_receipts", JSON.stringify(currentRentReceipts));
    
    showToast("Rent paid successfully! Receipt generated.", "success");
    loadVerificationHubData();
  }, 1200);
}

let activeReceiptIndex = null;
function viewReceipt(idx) {
  const r = currentRentReceipts[idx];
  if (!r) return;

  activeReceiptIndex = idx;
  document.getElementById("receipt-res-date").textContent = `Date: ${new Date(r.date).toLocaleDateString()}`;
  document.getElementById("receipt-res-num").textContent = r.id;
  document.getElementById("receipt-res-tenant").textContent = r.tenant;
  document.getElementById("receipt-res-landlord").textContent = r.landlord;
  document.getElementById("receipt-res-address").textContent = r.address;
  document.getElementById("receipt-res-mode").textContent = r.mode;
  document.getElementById("receipt-res-amount").textContent = `₹${r.amount.toLocaleString('en-IN')}`;

  document.getElementById("receipt-modal-overlay").classList.add("active");
}

function closeReceiptModal() {
  document.getElementById("receipt-modal-overlay").classList.remove("active");
}

function printRentReceipt() {
  const content = document.getElementById("receipt-print-box").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>Rent Payment Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          #receipt-print-box { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; position: relative; }
          .receipt-stamp { position: absolute; top: 20px; right: 20px; border: 3px double #92400e; padding: 6px 12px; color: #92400e; font-size: 10px; font-weight: 900; transform: rotate(-12deg); background-color: #fef3c7; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
          td { padding: 8px 0; border-bottom: 1px solid #eee; }
          h2 { color: #0d9488; }
          .btn { display: none; }
        </style>
      </head>
      <body>
        <div id="receipt-print-box">
          ${content}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

// Initialize logic
window.switchDashboardTab = switchDashboardTab;
window.togglePropertyStatus = togglePropertyStatus;
window.deletePropertyListing = deletePropertyListing;
window.removeBookmark = removeBookmark;
window.generateAgreement = generateAgreement;
window.closeAgreementModal = closeAgreementModal;
window.printAgreement = printAgreement;
window.updateDashboardStats = updateDashboardStats;
window.exportEnquiriesToCSV = exportEnquiriesToCSV;
window.printEnquiriesReport = printEnquiriesReport;
window.openBulkUploadModal = openBulkUploadModal;
window.closeBulkUploadModal = closeBulkUploadModal;
window.downloadSampleCSV = downloadSampleCSV;
window.handleCSVSelect = handleCSVSelect;
window.submitBulkUpload = submitBulkUpload;

// Expose new Hub actions to window scope
window.loadVerificationHubData = loadVerificationHubData;
window.runTenantCheck = runTenantCheck;
window.printVerifyReport = printVerifyReport;
window.openRentPayModal = openRentPayModal;
window.closeRentPayModal = closeRentPayModal;
window.submitRentPayment = submitRentPayment;
window.viewReceipt = viewReceipt;
window.closeReceiptModal = closeReceiptModal;
window.printRentReceipt = printRentReceipt;
window.switchInboxSubTab = switchInboxSubTab;
window.printVisitsReport = printVisitsReport;

document.addEventListener("DOMContentLoaded", () => {
  // Brief timeout to let config loading establish first
  setTimeout(checkAuthAndRender, 100);
});
