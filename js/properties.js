/* ==========================================================================
   PLATLO - PROPERTIES DIRECTORY & SEARCH JS
   ========================================================================== */

let currentFilterType = "sell"; // Default 'sell' or 'rent'
window.PLATLO_COMPARE = new Set();

// Valuation baselines for PropWorth Deal Badges
const VALUATION_BASELINES = {
  "Lucknow": { sell: 5000, rent: 15 },
  "Noida": { sell: 6500, rent: 20 },
  "Varanasi": { sell: 4500, rent: 12 },
  "Jhansi": { sell: 3500, rent: 9 },
  "Orai": { sell: 2500, rent: 7 },
  "Jalaun": { sell: 2200, rent: 6 },
  "Kalpi": { sell: 2000, rent: 5 },
  "Konch": { sell: 1800, rent: 5 }
};
const DEFAULT_VALUATION_BASELINE = { sell: 3000, rent: 10 };


// Set the Listing Type toggle filter
function setFilterType(type) {
  currentFilterType = type;
  document.getElementById("filter-type-sell").classList.toggle("active", type === "sell");
  document.getElementById("filter-type-rent").classList.toggle("active", type === "rent");
  applyFilters();
}

// Parse URL Query parameters on load
function parseQueryParams() {
  const params = new URLSearchParams(window.location.search);
  
  const aiQuery = params.get("ai_query");
  if (aiQuery) {
    const input = document.getElementById("ai-smart-search-input");
    if (input) {
      input.value = aiQuery;
      setTimeout(applyAISmartSearch, 150);
      return;
    }
  }
  
  const type = params.get("type");
  if (type === "sell" || type === "rent") {
    currentFilterType = type;
    document.getElementById("filter-type-sell").classList.toggle("active", type === "sell");
    document.getElementById("filter-type-rent").classList.toggle("active", type === "rent");
  }
  
  const city = params.get("city");
  if (city) {
    document.getElementById("search-city").value = city;
  }
  
  const locality = params.get("locality");
  if (locality) {
    document.getElementById("search-locality").value = locality;
  }
  
  const propType = params.get("prop_type");
  if (propType) {
    // Uncheck all first, then check only the query one
    document.querySelectorAll(".filter-prop-type").forEach(cb => {
      cb.checked = (cb.value === propType);
    });
  }

  const budget = params.get("budget");
  if (budget && budget !== "any") {
    document.getElementById("filter-price-max").value = parseInt(budget);
  }
}

// Main Filter Application Routing
async function applyFilters() {
  const container = document.getElementById("properties-results-container");
  if (!container) return;
  
  container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Searching properties database...</div>`;

  // Fetch search input values
  const city = document.getElementById("search-city").value;
  const locality = document.getElementById("search-locality").value.toLowerCase().trim();
  const sort = document.getElementById("search-sort").value;
  const priceMin = parseFloat(document.getElementById("filter-price-min").value) || 0;
  const priceMax = parseFloat(document.getElementById("filter-price-max").value) || Infinity;

  // Selected property types
  const checkedPropTypes = Array.from(document.querySelectorAll(".filter-prop-type:checked")).map(cb => cb.value);
  // Selected BHKs
  const checkedBhks = Array.from(document.querySelectorAll(".filter-bhk:checked")).map(cb => parseInt(cb.value));
  // Selected Furnishing
  const checkedFurnishing = Array.from(document.querySelectorAll(".filter-furnishing:checked")).map(cb => cb.value);
  // Selected Parking
  const checkedParking = Array.from(document.querySelectorAll(".filter-parking:checked")).map(cb => cb.value);

  let properties = [];

  // 1. QUERY FROM DATABASE (SUPABASE OR MOCK)
  if (window.PLATLO.isMock) {
    properties = window.PLATLO_DB.getProperties();
  } else {
    try {
      // Query properties in active city with specified listing type
      let query = window.PLATLO.supabase
        .from("properties")
        .select("*")
        .eq("city", city)
        .eq("listing_type", currentFilterType)
        .eq("status", "active");

      const { data, error } = await query;
      if (error) throw error;
      properties = data || [];
    } catch (err) {
      console.error("Supabase query failed. Loading localStorage mock data.", err);
      properties = window.PLATLO_DB.getProperties();
    }
  }

  // 2. CLIENT SIDE DYNAMIC FILTERS (Fast & highly interactive)
  const filteredProperties = properties.filter(prop => {
    // Match listing type and city (if mock)
    if (window.PLATLO.isMock) {
      if (prop.listing_type !== currentFilterType) return false;
      if (prop.city.toLowerCase() !== city.toLowerCase()) return false;
    }
    
    // Locality search (sub-string match)
    if (locality && !prop.locality.toLowerCase().includes(locality) && !prop.society.toLowerCase().includes(locality)) {
      return false;
    }

    // Property Type
    if (checkedPropTypes.length > 0 && !checkedPropTypes.includes(prop.property_type)) {
      return false;
    }

    // BHK Configuration
    if (checkedBhks.length > 0) {
      // If it's a plot or commercial workspace it might have 0 BHK
      const bhkVal = prop.bedrooms;
      if (checkedBhks.includes(4)) {
        // Handle 4+ case
        if (bhkVal < 4 && !checkedBhks.includes(bhkVal)) return false;
      } else {
        if (!checkedBhks.includes(bhkVal)) return false;
      }
    }

    // Price Bounds
    if (prop.price < priceMin || prop.price > priceMax) {
      return false;
    }

    // Furnishing Level
    if (checkedFurnishing.length > 0 && !checkedFurnishing.includes(prop.furnishing)) {
      return false;
    }

    // Parking Availability
    if (checkedParking.length > 0 && !checkedParking.includes(prop.parking)) {
      return false;
    }

    return true;
  });

  // 3. SORTING RESULTS
  filteredProperties.sort((a, b) => {
    if (sort === "price_low") {
      return a.price - b.price;
    } else if (sort === "price_high") {
      return b.price - a.price;
    } else if (sort === "popular") {
      return b.views_count - a.views_count;
    } else { // default 'newest'
      return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // 4. DISPLAY RESULTS COUNT
  const countText = document.getElementById("results-count");
  if (countText) {
    countText.textContent = `Showing ${filteredProperties.length} properties in ${city}`;
  }

  // Dynamic SEO title & description update based on filters
  let seoTitle = `Properties for ${currentFilterType === 'sell' ? 'Sale' : 'Rent'} in ${city} | Zero Brokerage | PLATLO`;
  if (locality) {
    seoTitle = `Properties in ${locality.charAt(0).toUpperCase() + locality.slice(1)}, ${city} for ${currentFilterType === 'sell' ? 'Sale' : 'Rent'} | PLATLO`;
  }
  document.title = seoTitle;
  
  // Update Meta Description
  let metaDesc = `Direct owner listings: Buy, sell, or rent apartments, villas, plots, and commercial spaces in ${city}${locality ? ` (${locality})` : ''} without paying brokerage. Browse verified details.`;
  const metaDescEl = document.querySelector('meta[name="description"]');
  if (metaDescEl) {
    metaDescEl.setAttribute("content", metaDesc);
  }

  // Update Visual Breadcrumbs
  const currentBreadcrumb = document.getElementById("search-breadcrumb-current");
  if (currentBreadcrumb) {
    const typeText = currentFilterType === 'sell' ? 'for Sale' : 'for Rent';
    if (locality) {
      currentBreadcrumb.innerHTML = `<a href="./properties.html?city=${encodeURIComponent(city)}" style="color: var(--primary); text-decoration: none; font-weight: 600;">Properties ${typeText} in ${city}</a> <span style="color: var(--text-muted);">/</span> <span style="color: var(--text-muted); font-weight: 500;">${locality}</span>`;
    } else {
      currentBreadcrumb.innerHTML = `<span style="color: var(--text-muted); font-weight: 500;">Properties ${typeText} in ${city}</span>`;
    }
  }

  // 5. RENDER CARDS
  renderPropertyCards(filteredProperties);
  updateSearchPageSchema(filteredProperties);
}

// Render property listings list into HTML
function renderPropertyCards(properties) {
  const container = document.getElementById("properties-results-container");
  if (!container) return;

  if (properties.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background-color: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <h3 style="font-size: 20px; margin-bottom: 8px;">No Properties Match Your Search</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Try resetting filters or searching in a wider locality.</p>
        <button class="btn btn-primary" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  // Fetch bookmarks if logged in
  const savedSet = new Set();
  const user = window.PLATLO.currentUser;
  
  if (user) {
    if (window.PLATLO.isMock) {
      window.PLATLO_DB.getSavedProperties()
        .filter(s => s.user_id === user.id)
        .forEach(s => savedSet.add(s.property_id));
    }
    // (If supabase, we could query, but mock layer caches it locally synchronously)
  }

  container.innerHTML = properties.map(prop => {
    const isRent = prop.listing_type === "rent";
    const priceFormatted = isRent 
      ? `₹${prop.price.toLocaleString('en-IN')}<span class="rent-period">/mo</span>` 
      : `₹${(prop.price >= 10000000 ? (prop.price/10000000).toFixed(2) + ' Cr' : (prop.price/100000).toFixed(2) + ' L')}`;
    
    const typeLabel = prop.property_type.charAt(0).toUpperCase() + prop.property_type.slice(1);
    const specLabel = prop.bedrooms > 0 ? `${prop.bedrooms} BHK` : `${prop.carpet_area} sq ft`;
    const isSaved = savedSet.has(prop.id);

    // Calculate PropWorth deal rating
    const baselineSet = VALUATION_BASELINES[prop.city] || DEFAULT_VALUATION_BASELINE;
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

    // Community moderation & AI pattern checking
    const isSuspicious = window.PLATLO_DB.isSuspiciousBrokerPhone(prop.contact_phone);
    const reports = window.PLATLO_DB.getReports();
    const isReported = reports.some(r => r.property_id === prop.id);
    
    let brokerAlertHtml = "";
    if (isSuspicious) {
      brokerAlertHtml = `<span class="badge" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(239, 68, 68, 0.4); text-shadow: 0 1px 2px rgba(0,0,0,0.2);">⚠️ Suspicious Broker</span>`;
    } else if (isReported) {
      brokerAlertHtml = `<span class="badge" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(245, 158, 11, 0.4);">⏳ Under Review</span>`;
    }

    return `
      <div class="property-card" onclick="location.href='./property.html?id=${prop.id}'" style="cursor: pointer;">
        <div class="card-media">
          <img src="${prop.images[0] || './images/property_1.jpg'}" alt="${prop.title}">
          <div class="card-badges">
            <span class="badge badge-owner">Direct Owner</span>
            ${worthBadgeHtml}
            ${brokerAlertHtml}
            <span class="badge badge-verified">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Verified
            </span>
          </div>
          <button class="btn-fav ${isSaved ? 'active' : ''}" onclick="event.stopPropagation(); handleToggleSave('${prop.id}', this)" title="Save Property">
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
          <div class="card-features">
            <div class="feature-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16M2 8h20M2 16h20M22 4v16"/></svg>
              <span>${specLabel}</span>
            </div>
            <div class="feature-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              <span>${prop.carpet_area} Sq.Ft</span>
            </div>
            <div class="feature-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M12 4v16"/></svg>
              <span>${prop.furnishing.replace('-furnished', '')}</span>
            </div>
          </div>
        </div>
        
        <div class="card-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="owner-info" style="display:flex; align-items:center; gap:8px;">
            <div class="owner-avatar">${prop.contact_name.charAt(0).toUpperCase()}</div>
            <span class="owner-name">${prop.contact_name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <label onclick="event.stopPropagation();" style="display:flex; align-items:center; gap:4px; font-size:12px; color:var(--text-muted); cursor:pointer; user-select:none;">
              <input type="checkbox" class="compare-checkbox" data-id="${prop.id}" onchange="toggleCompareProperty('${prop.id}', this.checked)" ${window.PLATLO_COMPARE && window.PLATLO_COMPARE.has(prop.id) ? 'checked' : ''} style="cursor:pointer; accent-color:var(--primary); width:14px; height:14px; margin:0;"> Compare
            </label>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); location.href='./property.html?id=${prop.id}&contact=1'">Contact</button>
            <button class="btn-report-flag" onclick="event.stopPropagation(); openReportModal('${prop.id}')" title="Report Broker / Fraud" style="background: none; border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; border-radius: var(--radius-sm); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Reset all filter controls
function resetFilters() {
  document.querySelectorAll(".filter-prop-type, .filter-bhk, .filter-furnishing, .filter-parking").forEach(cb => cb.checked = false);
  document.getElementById("filter-price-min").value = "";
  document.getElementById("filter-price-max").value = "";
  document.getElementById("search-locality").value = "";
  applyFilters();
}

// Handle Bookmarking
async function handleToggleSave(propertyId, buttonEl) {
  const user = window.PLATLO.currentUser;
  if (!user) {
    window.showToast("Please login to bookmark properties.", "info");
    window.openAuthModal();
    return;
  }

  if (window.PLATLO.isMock) {
    const isSaved = window.PLATLO_DB.toggleSaveProperty(user.id, propertyId);
    buttonEl.classList.toggle("active", isSaved);
    window.showToast(isSaved ? "Property added to bookmarks!" : "Property removed from bookmarks.");
  } else {
    try {
      // Toggle bookmarks table in Supabase
      const isCurrentlySaved = buttonEl.classList.contains("active");
      
      if (isCurrentlySaved) {
        const { error } = await window.PLATLO.supabase
          .from("saved_properties")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);
        
        if (error) throw error;
        buttonEl.classList.remove("active");
        window.showToast("Property removed from bookmarks.");
      } else {
        const { error } = await window.PLATLO.supabase
          .from("saved_properties")
          .insert({ user_id: user.id, property_id: propertyId });
        
        if (error) throw error;
        buttonEl.classList.add("active");
        window.showToast("Property added to bookmarks!");
      }
    } catch (err) {
      console.error("Failed to bookmark in Supabase, toggling mock session.", err);
      // Fallback toggling mock
      const isSaved = window.PLATLO_DB.toggleSaveProperty(user.id, propertyId);
      buttonEl.classList.toggle("active", isSaved);
    }
  }
}

// Listen for updates when authentication status changes
document.addEventListener("platloAuthChange", () => {
  applyFilters();
});

// Popular Localities dictionary
const POPULAR_LOCALITIES_BY_CITY = {
  "Orai": ["Patel Nagar", "Tulsi Nagar", "Jail Road", "Station Road", "Sharda Nagar", "Bajaria", "Sushil Nagar", "Lahariya Pura", "Konch Road", "Rath Road"],
  "Jalaun": ["Main Bazaar", "Devi Road", "Chhatra Chauraha", "Rajendra Nagar"],
  "Kalpi": ["Yamuna Ghat Road", "Station Road", "Tari Buland", "Jila Hospital Area"],
  "Konch": ["Chandni Chauraha", "Lajpat Nagar", "Saraswati Nagar", "Rath Road"],
  "Jhansi": ["Civil Lines", "Sadar Bazar", "Elite Crossing", "Kanpur Road"],
  "Lucknow": ["Hazratganj", "Gomti Nagar", "Aliganj", "Indira Nagar", "Mahanagar", "Charbagh"],
  "Kanpur": ["Kalyanpur", "Swaroop Nagar", "Civil Lines", "Kakadeo", "Kidwai Nagar"],
  "Noida": ["Sector 62", "Sector 15", "Sector 50", "Sector 18", "Sector 76", "Noida Extension"],
  "Ghaziabad": ["Indirapuram", "Vasundhara", "Vaishali", "Raj Nagar Extension", "Kavi Nagar"],
  "Agra": ["Sanjay Place", "Tajganj", "Sikandra", "Dayalbagh", "Fatehabad Road"],
  "Varanasi": ["Lanka", "Cantonment", "Sigra", "Assi Ghat", "Bhelupur", "Shivpur"],
  "Prayagraj": ["Civil Lines", "Katra", "Allahpur", "Jhalwa", "Tagore Town"],
  "Meerut": ["Shastri Nagar", "Modipuram", "Pallavpuram", "Civil Lines", "Saket"],
  "Gorakhpur": ["Golghar", "Medical College Road", "Taramandal", "Civil Lines"],
  "Ayodhya": ["Ram Janmabhoomi Road", "Naya Ghat", "Deokali", "Faizabad Chowk"],
  "Bareilly": ["Civil Lines", "Rajendra Nagar", "Suresh Sharma Nagar", "Pilibhit Bypass"],
  "Aligarh": ["Civil Lines", "Ramghat Road", "Centre Point", "Dodhpur"],
  "Moradabad": ["Civil Lines", "Kanth Road", "Budh Bazaar", "Ram Ganga Vihar"],
  "Saharanpur": ["Court Road", "Avas Vikas Colony", "Gill Colony", "Delhi Road"],
  "Mathura": ["Krishna Nagar", "Vrindavan Road", "Dampier Nagar", "Chowk Bazar"]
};

function updateLocalityTags() {
  const city = document.getElementById("search-city").value;
  const tagsContainer = document.getElementById("quick-locality-tags");
  if (!tagsContainer) return;

  const localities = POPULAR_LOCALITIES_BY_CITY[city] || [];
  tagsContainer.innerHTML = localities.map(loc => `
    <button onclick="selectLocalityTag('${loc}')" class="btn btn-secondary btn-sm" style="border-radius: var(--radius-full); padding: 4px 12px; font-size: 12px;">
      ${loc}
    </button>
  `).join('');
}

function selectLocalityTag(localityName) {
  const input = document.getElementById("search-locality");
  if (input) {
    input.value = localityName;
    applyFilters();
  }
}

function initSearchFAQs(properties) {
  const faqBox = document.getElementById("search-faq-accordion-box");
  const faqSection = document.getElementById("search-faq-section");
  if (!faqBox || !faqSection) return null;

  if (properties.length === 0) {
    faqSection.style.display = "none";
    return null;
  }

  faqSection.style.display = "block";

  const city = document.getElementById("search-city").value;
  const typeText = currentFilterType === 'sell' ? 'for Sale' : 'for Rent';
  const matchCount = properties.length;

  const faqs = [
    {
      q: `How many properties are listed ${typeText} in ${city}?`,
      a: `There are currently ${matchCount} properties listed ${typeText} in ${city} on PLATLO. All listings are 100% direct from owners, meaning there are absolutely zero brokerage fees.`
    },
    {
      q: `What is the starting price for properties in ${city}?`,
      a: `Prices in ${city} vary depending on configuration and locality. On our platform, you can find options starting from very affordable rates up to luxury properties. Toggle the sort order to 'Price: Low to High' to see the cheapest direct-owner listings first.`
    },
    {
      q: `How do I book a site visit for a property in ${city}?`,
      a: `To book a site visit, click on any property listing to view its detail page. Locate the 'Direct Site Visit Scheduler' widget, select your preferred date card and time slot, and click 'Book'. This will instantly generate your Verified Owner Site-Pass ticket.`
    }
  ];

  faqBox.innerHTML = faqs.map((faq, idx) => `
    <div class="faq-item" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary); overflow: hidden; margin-bottom: 12px; transition: all 0.3s ease;">
      <button onclick="toggleFAQ(${idx})" style="width: 100%; border: none; background: none; padding: 16px; text-align: left; font-weight: 700; color: var(--text-primary); font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
        <span>${faq.q}</span>
        <span id="faq-icon-${idx}" style="font-size: 18px; color: var(--primary); transition: transform 0.2s;">+</span>
      </button>
      <div id="faq-answer-${idx}" style="max-height: 0; overflow: hidden; transition: all 0.3s ease-out; border-top: 0 solid var(--border-color); color: var(--text-secondary); font-size: 13px; line-height: 1.6; padding: 0 16px;">
        <p style="margin-bottom: 16px; margin-top: 0;">${faq.a}</p>
      </div>
    </div>
  `).join('');

  if (!window.toggleFAQ) {
    window.toggleFAQ = function(idx) {
      const answer = document.getElementById(`faq-answer-${idx}`);
      const icon = document.getElementById(`faq-icon-${idx}`);
      if (!answer || !icon) return;

      const isOpen = answer.style.maxHeight && answer.style.maxHeight !== "0px";
      if (isOpen) {
        answer.style.maxHeight = "0px";
        answer.style.padding = "0 16px";
        answer.style.borderTopWidth = "0px";
        icon.textContent = "+";
        icon.style.transform = "rotate(0deg)";
      } else {
        document.querySelectorAll("[id^='faq-answer-']").forEach((el, i) => {
          el.style.maxHeight = "0px";
          el.style.padding = "0 16px";
          el.style.borderTopWidth = "0px";
          const iconEl = document.getElementById(`faq-icon-${i}`);
          if (iconEl) {
            iconEl.textContent = "+";
            iconEl.style.transform = "rotate(0deg)";
          }
        });
        answer.style.maxHeight = "150px";
        answer.style.padding = "16px";
        answer.style.borderTopWidth = "1px";
        icon.textContent = "−";
        icon.style.transform = "rotate(180deg)";
      }
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };
}

function updateSearchPageSchema(properties) {
  const existingSchema = document.getElementById("dynamic-search-schema");
  if (existingSchema) existingSchema.remove();

  const city = document.getElementById("search-city").value;

  // 1. Breadcrumbs Schema
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://platlo.com/index.html"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Uttar Pradesh",
        "item": "https://platlo.com/properties.html"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": city,
        "item": `https://platlo.com/properties.html?city=${encodeURIComponent(city)}`
      }
    ]
  };

  // 2. ItemList Schema for property cards
  const items = properties.map((prop, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "url": `https://platlo.com/property.html?id=${prop.id}`,
    "name": prop.title
  }));

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "numberOfItems": properties.length,
    "itemListElement": items
  };

  // 3. FAQ Schema
  const faqSchema = initSearchFAQs(properties);

  const graph = [breadcrumbList, itemListSchema];
  if (faqSchema) graph.push(faqSchema);

  const scriptEl = document.createElement("script");
  scriptEl.id = "dynamic-search-schema";
  scriptEl.type = "application/ld+json";
  scriptEl.text = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph
  });
  
  document.head.appendChild(scriptEl);
}

// AI Natural Language Smart Search Parser
function applyAISmartSearch() {
  const input = document.getElementById("ai-smart-search-input");
  if (!input) return;

  const query = input.value.trim();
  if (!query) return;

  const q = query.toLowerCase();

  // 1. Transaction Type Detection
  if (q.includes("rent") || q.includes("hire") || q.includes("lease")) {
    setFilterType("rent");
  } else if (q.includes("sell") || q.includes("buy") || q.includes("sale") || q.includes("purchase") || q.includes("plot") || q.includes("crore") || q.includes("lakh") || q.includes("lacs")) {
    setFilterType("sell");
  }

  // 2. Property Type Checkboxes
  const isApartment = q.includes("apartment") || q.includes("flat");
  const isHouse = q.includes("house") || q.includes("villa") || q.includes("duplex") || q.includes("home");
  const isPlot = q.includes("plot") || q.includes("land");
  const isCommercial = q.includes("commercial") || q.includes("shop") || q.includes("office") || q.includes("showroom");

  const propTypes = { apartment: isApartment, house: isHouse, plot: isPlot, commercial: isCommercial };
  const matchedTypes = Object.keys(propTypes).filter(k => propTypes[k]);

  if (matchedTypes.length > 0) {
    document.querySelectorAll(".filter-prop-type").forEach(cb => {
      cb.checked = matchedTypes.includes(cb.value);
    });
  } else {
    document.querySelectorAll(".filter-prop-type").forEach(cb => cb.checked = true);
  }

  // 3. BHK Configuration Checkboxes
  let matchedBhks = [];
  if (q.includes("1 bhk") || q.includes("1bhk") || q.includes("1 bedroom")) matchedBhks.push(1);
  if (q.includes("2 bhk") || q.includes("2bhk") || q.includes("2 bedroom")) matchedBhks.push(2);
  if (q.includes("3 bhk") || q.includes("3bhk") || q.includes("3 bedroom")) matchedBhks.push(3);
  if (q.includes("4 bhk") || q.includes("4bhk") || q.includes("4 bedroom") || q.includes("4+ bhk")) matchedBhks.push(4);

  if (matchedBhks.length > 0) {
    document.querySelectorAll(".filter-bhk").forEach(cb => {
      const val = parseInt(cb.value);
      cb.checked = matchedBhks.includes(val);
    });
  } else {
    document.querySelectorAll(".filter-bhk").forEach(cb => cb.checked = false);
  }

  // 4. Locality Detection (matches populated city popular localities list)
  const city = document.getElementById("search-city").value;
  const localities = POPULAR_LOCALITIES_BY_CITY[city] || [];
  let foundLocality = "";
  for (const loc of localities) {
    if (q.includes(loc.toLowerCase())) {
      foundLocality = loc;
      break;
    }
  }

  if (foundLocality) {
    document.getElementById("search-locality").value = foundLocality;
  } else {
    document.getElementById("search-locality").value = "";
  }

  // 5. Budget Limits Extraction
  let minBudget = "";
  let maxBudget = "";

  const underPatterns = /(?:under|below|max|maximum|within|less than|budget of)\s*(?:rs\.?)?\s*([\d,]+)\s*(lakh|lakhs|lacs|lac|k|thousand|cr|crore)?/i;
  const match = q.match(underPatterns);
  if (match) {
    let num = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2] ? match[2].toLowerCase() : "";

    if (unit.includes("lakh") || unit.includes("lac")) {
      num *= 100000;
    } else if (unit.includes("k") || unit.includes("thousand")) {
      num *= 1000;
    } else if (unit.includes("crore") || unit.includes("cr")) {
      num *= 10000000;
    } else {
      if (num < 1000) {
        if (currentFilterType === "rent") {
          num *= 1000;
        } else {
          num *= 100000;
        }
      }
    }
    maxBudget = num;
  }

  document.getElementById("filter-price-min").value = minBudget;
  document.getElementById("filter-price-max").value = maxBudget || "";

  // 6. Furnishing Status Checkboxes
  if (q.includes("semi-furnished") || q.includes("semi furnished")) {
    document.querySelectorAll(".filter-furnishing").forEach(cb => cb.checked = cb.value === "semi-furnished");
  } else if (q.includes("fully-furnished") || q.includes("fully furnished") || q.includes("furnished")) {
    document.querySelectorAll(".filter-furnishing").forEach(cb => cb.checked = cb.value === "fully-furnished");
  } else if (q.includes("unfurnished") || q.includes("empty") || q.includes("bare")) {
    document.querySelectorAll(".filter-furnishing").forEach(cb => cb.checked = cb.value === "unfurnished");
  } else {
    document.querySelectorAll(".filter-furnishing").forEach(cb => cb.checked = false);
  }

  // 7. Parking Configuration Checkboxes
  if (q.includes("car parking") || q.includes("car park")) {
    document.querySelectorAll(".filter-parking").forEach(cb => cb.checked = cb.value === "car" || cb.value === "both");
  } else if (q.includes("bike parking")) {
    document.querySelectorAll(".filter-parking").forEach(cb => cb.checked = cb.value === "bike" || cb.value === "both");
  } else if (q.includes("parking")) {
    document.querySelectorAll(".filter-parking").forEach(cb => cb.checked = true);
  } else {
    document.querySelectorAll(".filter-parking").forEach(cb => cb.checked = false);
  }

  // Trigger search execution
  applyFilters();
  window.showToast("AI applied filters based on your prompt!", "success");
}

function fillAISmartSearch(text) {
  const input = document.getElementById("ai-smart-search-input");
  if (input) {
    input.value = text;
    applyAISmartSearch();
  }
}

// Property Comparison Feature
function initCompareFeature() {
  const bar = document.createElement("div");
  bar.id = "compare-bar";
  bar.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(150%);
    z-index: 1000;
    background: var(--header-bg, rgba(15, 23, 42, 0.85));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    padding: 12px 24px;
    border-radius: var(--radius-full, 50px);
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3));
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    color: var(--text-primary, #fff);
  `;
  bar.innerHTML = `
    <span style="font-size: 14px; font-weight: 500;" id="compare-bar-text">Compare 0 properties</span>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary btn-sm" onclick="openCompareModal()" style="border-radius: var(--radius-full, 50px); padding: 6px 16px; font-size: 12px; border: none; font-weight:600; cursor:pointer;">Compare Now</button>
      <button class="btn btn-secondary btn-sm" onclick="clearCompareList()" style="border-radius: var(--radius-full, 50px); padding: 6px 12px; font-size: 12px; font-weight:600; cursor:pointer; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white;">Clear</button>
    </div>
  `;
  document.body.appendChild(bar);
}

function toggleCompareProperty(propId, isChecked) {
  if (isChecked) {
    if (window.PLATLO_COMPARE.size >= 3) {
      window.showToast("You can compare up to 3 properties at a time.", "error");
      const checkbox = document.querySelector(`.compare-checkbox[data-id="${propId}"]`);
      if (checkbox) checkbox.checked = false;
      return;
    }
    window.PLATLO_COMPARE.add(propId);
    window.showToast("Added to comparison list", "success");
  } else {
    window.PLATLO_COMPARE.delete(propId);
    window.showToast("Removed from comparison list", "info");
  }
  updateCompareBar();
}

function updateCompareBar() {
  const bar = document.getElementById("compare-bar");
  const text = document.getElementById("compare-bar-text");
  if (!bar || !text) return;

  const count = window.PLATLO_COMPARE.size;
  text.textContent = `Compare ${count} propert${count === 1 ? 'y' : 'ies'} (max 3)`;
  
  if (count > 0) {
    bar.style.transform = "translateX(-50%) translateY(0)";
  } else {
    bar.style.transform = "translateX(-50%) translateY(150%)";
  }
}

function clearCompareList() {
  window.PLATLO_COMPARE.clear();
  document.querySelectorAll(".compare-checkbox").forEach(cb => cb.checked = false);
  updateCompareBar();
  window.showToast("Comparison list cleared", "info");
}

function openCompareModal() {
  if (window.PLATLO_COMPARE.size === 0) return;

  const allProps = window.PLATLO_DB.getProperties();
  const selectedProps = allProps.filter(p => window.PLATLO_COMPARE.has(p.id));

  const getRowHtml = (label, selectorFn) => {
    return `
      <tr>
        <td style="font-weight: 600; padding: 12px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); width: 160px; font-size: 13px;">${label}</td>
        ${selectedProps.map(p => `
          <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center; font-size: 13px; color: var(--text-primary);">${selectorFn(p)}</td>
        `).join('')}
      </tr>
    `;
  };

  const modalHtml = `
    <div id="compare-modal-overlay" class="modal-overlay active" style="z-index: 1100;">
      <div class="modal-content" style="max-width: 900px; width: 95%; padding: 24px; border-radius: var(--radius-lg); background: var(--bg-primary); border: 1px solid var(--border-color); max-height: 85vh; overflow-y: auto;">
        <button class="modal-close" onclick="closeCompareModal()">&times;</button>
        <h3 style="font-size: 22px; margin-bottom: 20px; text-align: center; color: var(--text-primary);">Property Comparison</h3>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; min-width: 500px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color);">
                <th style="padding: 12px; text-align: left; background: var(--bg-secondary); border-bottom: 2px solid var(--border-color); font-size: 13px; color: var(--text-muted);">Attribute</th>
                ${selectedProps.map(p => `
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-color); font-size: 13px;">
                    <img src="${p.images[0] || './images/property_1.jpg'}" style="width: 120px; height: 80px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; border: 1px solid var(--border-color);">
                    <a href="./property.html?id=${p.id}" target="_blank" style="font-weight: 600; color: var(--primary); text-decoration: none; font-size: 13px; display: block; max-width: 180px; margin: 0 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.title}">${p.title}</a>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${getRowHtml("Price", p => {
                const isRent = p.listing_type === "rent";
                return isRent 
                  ? `<strong>₹${p.price.toLocaleString('en-IN')}</strong>/mo` 
                  : `<strong>₹${(p.price >= 10000000 ? (p.price/10000000).toFixed(2) + ' Cr' : (p.price/100000).toFixed(2) + ' L')}</strong>`;
              })}
              ${getRowHtml("Location", p => `<span>${p.locality}, ${p.city}</span>`)}
              ${getRowHtml("Property Type", p => `<span style="text-transform: capitalize;">${p.property_type}</span>`)}
              ${getRowHtml("Configuration", p => p.bedrooms > 0 ? `${p.bedrooms} BHK` : "N/A (Plot/Commercial)")}
              ${getRowHtml("Carpet Area", p => `<span>${p.carpet_area} Sq.Ft</span>`)}
              ${getRowHtml("Price / Sq.Ft", p => {
                const rate = Math.round(p.price / p.carpet_area);
                return `₹${rate.toLocaleString('en-IN')}/${p.listing_type === 'rent' ? 'mo/sq.ft' : 'sq.ft'}`;
              })}
              ${getRowHtml("Furnishing Status", p => `<span style="text-transform: capitalize;">${p.furnishing}</span>`)}
              ${getRowHtml("Parking Type", p => `<span style="text-transform: capitalize;">${p.parking}</span>`)}
              ${getRowHtml("Floor Level", p => p.property_type === 'plot' ? 'N/A' : `Floor ${p.floor} of ${p.total_floors}`)}
              ${getRowHtml("Contact Seller", p => `
                <div style="font-size: 12px; line-height: 1.4;">
                  <strong>${p.contact_name}</strong><br>
                  <a href="tel:${p.contact_phone}" style="color: var(--primary); font-weight:600;">${p.contact_phone}</a>
                </div>
              `)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const oldModal = document.getElementById("compare-modal-overlay");
  if (oldModal) oldModal.remove();

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = modalHtml.trim();
  const modalEl = tempDiv.firstChild;
  document.body.appendChild(modalEl);

  document.addEventListener("keydown", handleCompareEscape);
}

function closeCompareModal() {
  const modal = document.getElementById("compare-modal-overlay");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => modal.remove(), 300);
  }
  document.removeEventListener("keydown", handleCompareEscape);
}

function handleCompareEscape(e) {
  if (e.key === "Escape") closeCompareModal();
}

// ==========================================================================
// HYPERLOCAL NEIGHBORHOOD HEATMAPS (VISUAL SEO)
// ==========================================================================
const LOCALITY_ANALYTICS = {
  "Orai": [
    { name: "Patel Nagar", appreciation: 15, safety: 9.0, walkability: 88, desc: "Premium residential zone with fast appreciation near Raj Palace.", points: "50,50 180,30 220,120 80,140" },
    { name: "Tulsi Nagar", appreciation: 12, safety: 8.5, walkability: 82, desc: "Highly connected locality close to Orai Railway Station.", points: "180,30 320,40 300,130 220,120" },
    { name: "Jail Road", appreciation: 18, safety: 8.0, walkability: 75, desc: "Rapidly expanding development hub with new plot projects.", points: "80,140 220,120 200,240 60,220" },
    { name: "Station Road", appreciation: 9, safety: 7.5, walkability: 90, desc: "High footfall retail commercial zone with premium offices.", points: "220,120 300,130 420,150 380,240 200,240" },
    { name: "Sharda Nagar", appreciation: 14, safety: 8.8, walkability: 78, desc: "Upscale residential area, home to families and medical professionals.", points: "320,40 480,50 450,140 300,130" },
    { name: "Bajaria", appreciation: 8, safety: 7.0, walkability: 95, desc: "Classic wholesale and retail market with high pedestrian density.", points: "300,130 450,140 520,220 380,240" },
    { name: "Sushil Nagar", appreciation: 11, safety: 8.3, walkability: 70, desc: "Peaceful residential extension area with moderate pricing.", points: "60,220 200,240 160,340 40,320" }
  ],
  "Lucknow": [
    { name: "Gomti Nagar", appreciation: 16, safety: 9.2, walkability: 85, desc: "Upscale high-rise township with broad roads, parks, and top amenities.", points: "40,40 220,30 260,150 80,160" },
    { name: "Hazratganj", appreciation: 10, safety: 8.8, walkability: 96, desc: "Historic city center, high street shopping, high pedestrian density.", points: "220,30 380,40 350,150 260,150" },
    { name: "Aliganj", appreciation: 12, safety: 8.5, walkability: 80, desc: "Well-established residential pocket with excellent schools.", points: "80,160 260,150 230,290 70,270" },
    { name: "Indira Nagar", appreciation: 11, safety: 8.3, walkability: 84, desc: "One of the largest residential colonies in Asia. Stable demand.", points: "260,150 350,150 440,260 230,290" },
    { name: "Charbagh", appreciation: 8, safety: 7.2, walkability: 90, desc: "Major transit node, busy railway station area with retail offices.", points: "230,290 440,260 410,360 200,350" }
  ],
  "Noida": [
    { name: "Sector 62", appreciation: 14, safety: 8.7, walkability: 86, desc: "IT hub and commercial center with excellent metro access.", points: "50,50 220,40 240,160 80,150" },
    { name: "Sector 15", appreciation: 11, safety: 8.2, walkability: 92, desc: "Established residential area near Delhi border and commercial hubs.", points: "220,40 380,30 350,140 240,160" },
    { name: "Sector 50", appreciation: 15, safety: 9.3, walkability: 84, desc: "Posh gated residential communities, parks, and high safety.", points: "80,150 240,160 210,280 60,250" },
    { name: "Sector 18", appreciation: 9, safety: 8.0, walkability: 96, desc: "Noida's premier commercial market, shopping malls, and food hubs.", points: "240,160 350,140 440,250 210,280" }
  ]
};

const DEFAULT_LOCALITY_ANALYTICS = [
  { name: "Civil Lines", appreciation: 13, safety: 9.0, walkability: 88, desc: "Posh administrative and residential corridor with high baseline rates.", points: "50,50 250,30 220,160 80,140" },
  { name: "Sadar Bazar", appreciation: 9, safety: 8.0, walkability: 93, desc: "High density commercial and retail hub with strong transit connectivity.", points: "250,30 420,40 380,150 220,160" },
  { name: "Rajendra Nagar", appreciation: 14, safety: 8.4, walkability: 79, desc: "Growing residential corridor with new modern apartments.", points: "80,140 220,160 200,280 60,250" },
  { name: "Station Road", appreciation: 8, safety: 7.5, walkability: 87, desc: "Transit-oriented commercial stretch with multiple retail hubs.", points: "220,160 380,150 440,260 200,280" }
];

let activeHeatmapLayer = "appreciation";
let selectedHeatmapLocality = null;

function toggleHeatmap(show) {
  const overlay = document.getElementById("heatmap-modal-overlay");
  if (!overlay) return;
  
  if (show) {
    overlay.classList.add("active");
    const city = document.getElementById("search-city").value;
    document.getElementById("heatmap-title").textContent = `Neighborhood Heatmap - ${city}`;
    renderHeatmapSVG();
    document.addEventListener("keydown", handleHeatmapEscape);
  } else {
    overlay.classList.remove("active");
    document.removeEventListener("keydown", handleHeatmapEscape);
  }
}

function handleHeatmapEscape(e) {
  if (e.key === "Escape") toggleHeatmap(false);
}

function switchHeatmapLayer(layer) {
  activeHeatmapLayer = layer;
  
  const buttons = ["appreciation", "safety", "walkability"];
  buttons.forEach(btn => {
    const el = document.getElementById(`layer-btn-${btn}`);
    if (el) {
      if (btn === layer) {
        el.className = "btn btn-primary btn-sm";
        el.style.cssText = "font-size: 10.5px; padding: 4px 10px; border-radius: var(--radius-xs); border: none; font-weight: 700;";
      } else {
        el.className = "btn btn-secondary btn-sm";
        el.style.cssText = "font-size: 10.5px; padding: 4px 10px; border-radius: var(--radius-xs); background: none; border: none; color: var(--text-muted); font-weight: 700;";
      }
    }
  });

  const legend = document.getElementById("heatmap-legend");
  if (legend) {
    if (layer === "appreciation") {
      legend.innerHTML = `
        <span style="color: #f59e0b;">+5% Growth</span>
        <div style="width: 80px; height: 8px; border-radius: var(--radius-full); background: linear-gradient(to right, #f59e0b 0%, #10b981 100%);"></div>
        <span style="color: #10b981;">+20% Growth</span>
      `;
    } else if (layer === "safety") {
      legend.innerHTML = `
        <span style="color: #f59e0b;">6.0 Safety</span>
        <div style="width: 80px; height: 8px; border-radius: var(--radius-full); background: linear-gradient(to right, #f59e0b 0%, #3b82f6 100%);"></div>
        <span style="color: #3b82f6;">10.0 Safety</span>
      `;
    } else {
      legend.innerHTML = `
        <span style="color: #64748b;">60 Walk</span>
        <div style="width: 80px; height: 8px; border-radius: var(--radius-full); background: linear-gradient(to right, #64748b 0%, #06b6d4 100%);"></div>
        <span style="color: #06b6d4;">100 Walk</span>
      `;
    }
  }
  
  renderHeatmapSVG();
}

function interpolateColor(percent, layer) {
  if (layer === "appreciation") {
    // Hue from 25 (Orange/Red) to 142 (Emerald Green)
    const hue = Math.round(25 + (percent * 117));
    return `hsl(${hue}, 80%, 45%)`;
  } else if (layer === "safety") {
    // Hue from 35 (Amber) to 215 (Blue)
    const hue = Math.round(35 + (percent * 180));
    return `hsl(${hue}, 75%, 48%)`;
  } else {
    // Slate HSL(210, 20%, 60%) to Cyan HSL(180, 85%, 45%)
    const hue = Math.round(210 - (percent * 30));
    const sat = Math.round(20 + (percent * 65));
    const light = Math.round(60 - (percent * 15));
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
}

function renderHeatmapSVG() {
  const city = document.getElementById("search-city").value;
  const wrapper = document.getElementById("svg-map-wrapper");
  if (!wrapper) return;
  
  const localities = LOCALITY_ANALYTICS[city] || DEFAULT_LOCALITY_ANALYTICS;
  
  let pathsHtml = "";
  
  localities.forEach((loc, index) => {
    // Determine percent position for color coding
    let percent = 0.5;
    if (activeHeatmapLayer === "appreciation") {
      percent = Math.min(Math.max((loc.appreciation - 5) / 15, 0), 1);
    } else if (activeHeatmapLayer === "safety") {
      percent = Math.min(Math.max((loc.safety - 6.0) / 4.0, 0), 1);
    } else if (activeHeatmapLayer === "walkability") {
      percent = Math.min(Math.max((loc.walkability - 60) / 40, 0), 1);
    }
    
    const color = interpolateColor(percent, activeHeatmapLayer);
    
    // Calculate Centroid of polygon coordinates
    const coords = loc.points.split(" ").map(p => p.split(",").map(Number));
    let sumX = 0, sumY = 0;
    coords.forEach(([x, y]) => { sumX += x; sumY += y; });
    const centerX = Math.round(sumX / coords.length);
    const centerY = Math.round(sumY / coords.length);
    
    const isSelected = selectedHeatmapLocality === loc.name;
    
    pathsHtml += `
      <g style="cursor:pointer;" onclick="selectHeatmapLocality('${loc.name}', ${loc.appreciation}, ${loc.safety}, ${loc.walkability}, '${loc.desc.replace(/'/g, "\\'")}')">
        <polygon 
          points="${loc.points}" 
          class="heatmap-path" 
          fill="${color}" 
          fill-opacity="${isSelected ? 0.95 : 0.6}" 
          stroke="${isSelected ? 'var(--primary)' : 'var(--bg-primary)'}" 
          stroke-width="${isSelected ? 3 : 1.5}"
          style="transition: all 0.25s ease;"
        />
        <text 
          x="${centerX}" 
          y="${centerY}" 
          text-anchor="middle" 
          dominant-baseline="middle" 
          style="font-size: 11px; font-weight: 800; fill: var(--text-primary); pointer-events: none; text-shadow: 0 1px 3px rgba(0,0,0,0.85);"
        >
          ${loc.name}
        </text>
      </g>
    `;
  });
  
  wrapper.innerHTML = `
    <svg viewBox="0 0 600 400" style="width:100%; height:100%; max-height:360px;">
      ${pathsHtml}
    </svg>
  `;
}

function selectHeatmapLocality(name, appreciation, safety, walkability, desc) {
  selectedHeatmapLocality = name;
  
  // Re-render SVG to show active borders
  renderHeatmapSVG();
  
  // Update details panel
  document.getElementById("heatmap-zone-name").textContent = name;
  document.getElementById("heatmap-stat-appreciation").innerHTML = `<span style="color:#10b981; font-weight:800;">+${appreciation}% YoY</span>`;
  document.getElementById("heatmap-stat-safety").innerHTML = `<span style="color:#3b82f6; font-weight:800;">${safety.toFixed(1)}/10</span>`;
  document.getElementById("heatmap-stat-walkability").innerHTML = `<span style="color:#06b6d4; font-weight:800;">${walkability}/100</span>`;
  document.getElementById("heatmap-zone-description").textContent = desc;
  
  // Enable search explore button
  const exploreBtn = document.getElementById("heatmap-explore-btn");
  if (exploreBtn) {
    exploreBtn.removeAttribute("disabled");
  }
}

function exploreSelectedHeatmapZone() {
  if (!selectedHeatmapLocality) return;
  
  const input = document.getElementById("search-locality");
  if (input) {
    input.value = selectedHeatmapLocality;
    applyFilters();
    toggleHeatmap(false);
    window.showToast(`Showing listings in ${selectedHeatmapLocality}`, "success");
  }
}

// ==========================================================================
// DYNAMIC BROKER FLAGGING (COMMUNITY MODERATION)
// ==========================================================================
function openReportModal(propertyId) {
  const overlay = document.getElementById("report-modal-overlay");
  const idInput = document.getElementById("report-property-id");
  const form = document.getElementById("report-listing-form");
  
  if (overlay && idInput && form) {
    form.reset();
    idInput.value = propertyId;
    overlay.classList.add("active");
    document.addEventListener("keydown", handleReportEscape);
  }
}

function closeReportModal() {
  const overlay = document.getElementById("report-modal-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    document.removeEventListener("keydown", handleReportEscape);
  }
}

function handleReportEscape(e) {
  if (e.key === "Escape") closeReportModal();
}

function handleReportSubmit(event) {
  event.preventDefault();
  
  const propertyId = document.getElementById("report-property-id").value;
  const reason = document.getElementById("report-reason").value;
  const comments = document.getElementById("report-comments").value;
  
  const properties = window.PLATLO_DB.getProperties();
  const prop = properties.find(p => p.id === propertyId);
  
  if (!prop) {
    window.showToast("Property listing not found.", "error");
    closeReportModal();
    return;
  }
  
  const report = {
    id: "rep-" + Math.random().toString(36).substr(2, 9),
    property_id: propertyId,
    phone: prop.contact_phone,
    reason,
    comments,
    created_at: new Date().toISOString()
  };
  
  // Save report locally
  window.PLATLO_DB.saveReport(report);
  
  // If flagged as broker, prompt notification
  if (reason === "broker") {
    window.showToast("Community flag logged! Fraud checks applied to duplicate phone numbers.", "success");
  } else {
    window.showToast("Thank you! Listing reported successfully for moderation review.", "success");
  }
  
  closeReportModal();
  
  // Refresh card layout to show badges
  applyFilters();
}

// Heatmap Modal exports
window.toggleHeatmap = toggleHeatmap;
window.switchHeatmapLayer = switchHeatmapLayer;
window.selectHeatmapLocality = selectHeatmapLocality;
window.exploreSelectedHeatmapZone = exploreSelectedHeatmapZone;

// Report Modal exports
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.handleReportSubmit = handleReportSubmit;


// ==========================================================================
// LOCALITY VS. LOCALITY COMPARE DASHBOARD (VISUAL SEO)
// ==========================================================================
let activeCompareCity = "Orai";

function toggleLocalityCompare(show) {
  const overlay = document.getElementById("locality-compare-modal-overlay");
  if (!overlay) return;
  
  if (show) {
    overlay.classList.add("active");
    
    // Populate City Select
    const citySelect = document.getElementById("compare-select-city");
    const currentCity = document.getElementById("search-city").value;
    activeCompareCity = currentCity;
    
    const cities = ["Orai", "Jalaun", "Kalpi", "Konch", "Jhansi", "Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Varanasi", "Prayagraj", "Meerut", "Bareilly", "Gorakhpur", "Aligarh", "Moradabad", "Saharanpur", "Ayodhya", "Mathura"];
    citySelect.innerHTML = cities.map(c => `<option value="${c}" ${c === currentCity ? 'selected' : ''}>${c}</option>`).join('');
    
    populateLocalityCompareDropdowns();
    document.addEventListener("keydown", handleCompareDashboardEscape);
  } else {
    overlay.classList.remove("active");
    document.removeEventListener("keydown", handleCompareDashboardEscape);
  }
}

function handleCompareDashboardEscape(e) {
  if (e.key === "Escape") toggleLocalityCompare(false);
}

function switchCompareCity() {
  activeCompareCity = document.getElementById("compare-select-city").value;
  populateLocalityCompareDropdowns();
}

function populateLocalityCompareDropdowns() {
  const localities = POPULAR_LOCALITIES_BY_CITY[activeCompareCity] || POPULAR_LOCALITIES_BY_CITY["Orai"];
  const selectA = document.getElementById("compare-select-loc-a");
  const selectB = document.getElementById("compare-select-loc-b");
  if (!selectA || !selectB) return;
  
  selectA.innerHTML = localities.map((loc, idx) => `<option value="${loc}" ${idx === 0 ? 'selected' : ''}>${loc}</option>`).join('');
  selectB.innerHTML = localities.map((loc, idx) => `<option value="${loc}" ${idx === 1 || (localities.length === 1 && idx === 0) ? 'selected' : ''}>${loc}</option>`).join('');
  
  renderLocalityCompare();
}

function renderLocalityCompare() {
  const locA = document.getElementById("compare-select-loc-a").value;
  const locB = document.getElementById("compare-select-loc-b").value;
  
  document.getElementById("compare-th-loc-a").textContent = locA;
  document.getElementById("compare-th-loc-b").textContent = locB;
  
  // Fetch stats from LOCALITY_ANALYTICS or default
  const cityLocs = LOCALITY_ANALYTICS[activeCompareCity] || [];
  const defaults = DEFAULT_LOCALITY_ANALYTICS;
  
  const statsA = cityLocs.find(l => l.name === locA) || defaults.find(l => l.name === locA) || { appreciation: 10, safety: 8.0, walkability: 80, desc: "Residential area in development corridor." };
  const statsB = cityLocs.find(l => l.name === locB) || defaults.find(l => l.name === locB) || { appreciation: 12, safety: 8.5, walkability: 84, desc: "Established residential sector with schools." };
  
  // Calculate average price based on baseline values
  const baseline = VALUATION_BASELINES[activeCompareCity] || DEFAULT_VALUATION_BASELINE;
  const priceA = baseline.sell * (1 + (statsA.appreciation - 10) * 0.04);
  const priceB = baseline.sell * (1 + (statsB.appreciation - 10) * 0.04);
  
  document.getElementById("compare-price-a").textContent = `₹${Math.round(priceA).toLocaleString('en-IN')}/sq.ft`;
  document.getElementById("compare-price-b").textContent = `₹${Math.round(priceB).toLocaleString('en-IN')}/sq.ft`;
  
  // Mock counts
  let hashA = 0, hashB = 0;
  for(let i=0; i<locA.length; i++) hashA += locA.charCodeAt(i);
  for(let i=0; i<locB.length; i++) hashB += locB.charCodeAt(i);
  
  const schoolsA = 5 + (hashA % 8);
  const schoolsB = 5 + (hashB % 8);
  const hospA = 2 + (hashA % 5);
  const hospB = 2 + (hashB % 5);
  
  const activeProperties = window.PLATLO_DB.getProperties();
  const countA = activeProperties.filter(p => p.city === activeCompareCity && p.locality.toLowerCase().includes(locA.toLowerCase())).length;
  const countB = activeProperties.filter(p => p.city === activeCompareCity && p.locality.toLowerCase().includes(locB.toLowerCase())).length;
  
  document.getElementById("compare-schools-a").textContent = schoolsA;
  document.getElementById("compare-schools-b").textContent = schoolsB;
  document.getElementById("compare-hospitals-a").textContent = hospA;
  document.getElementById("compare-hospitals-b").textContent = hospB;
  document.getElementById("compare-listings-a").textContent = countA;
  document.getElementById("compare-listings-b").textContent = countB;
  
  // Update bars
  document.getElementById("compare-val-safety-a").textContent = `${statsA.safety.toFixed(1)}/10`;
  document.getElementById("compare-val-safety-b").textContent = `${statsB.safety.toFixed(1)}/10`;
  document.getElementById("compare-bar-safety-a").style.width = `${statsA.safety * 10}%`;
  document.getElementById("compare-bar-safety-b").style.width = `${statsB.safety * 10}%`;
  
  document.getElementById("compare-val-walk-a").textContent = `${statsA.walkability}/100`;
  document.getElementById("compare-val-walk-b").textContent = `${statsB.walkability}/100`;
  document.getElementById("compare-bar-walk-a").style.width = `${statsA.walkability}%`;
  document.getElementById("compare-bar-walk-b").style.width = `${statsB.walkability}%`;
  
  // Update Verdict
  const growthA = statsA.appreciation;
  const growthB = statsB.appreciation;
  
  let verdictText = `Comparing **${locA}** and **${locB}** in ${activeCompareCity}: <br><br>`;
  if (priceA > priceB) {
    verdictText += `• **Valuation:** ${locA} is priced at a premium (₹${Math.round(priceA).toLocaleString('en-IN')}/sq.ft) compared to ${locB} (₹${Math.round(priceB).toLocaleString('en-IN')}/sq.ft). <br>`;
  } else {
    verdictText += `• **Valuation:** ${locB} is priced at a premium (₹${Math.round(priceB).toLocaleString('en-IN')}/sq.ft) compared to ${locA} (₹${Math.round(priceA).toLocaleString('en-IN')}/sq.ft). <br>`;
  }
  
  if (growthA > growthB) {
    verdictText += `• **Appreciation:** ${locA} displays higher investment momentum (+${growthA}% YoY) outperforming ${locB} (+${growthB}% YoY). <br>`;
  } else {
    verdictText += `• **Appreciation:** ${locB} displays higher investment momentum (+${growthB}% YoY) outperforming ${locA} (+${growthA}% YoY). <br>`;
  }
  
  if (statsA.safety > statsB.safety) {
    verdictText += `• **Safety:** Families may favor ${locA} for its higher crime safety score (${statsA.safety.toFixed(1)}/10). <br>`;
  } else {
    verdictText += `• **Safety:** Families may favor ${locB} for its higher crime safety score (${statsB.safety.toFixed(1)}/10). <br>`;
  }
  
  // Bold formatting conversion
  document.getElementById("compare-verdict-text").innerHTML = verdictText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  drawLocalityCompareChart(locA, priceA, statsA.appreciation, locB, priceB, statsB.appreciation);
}

function drawLocalityCompareChart(locA, priceA, growthA, locB, priceB, growthB) {
  const wrapper = document.getElementById("compare-chart-wrapper");
  if (!wrapper) return;
  
  // Price projections back to 2022
  const gA = growthA / 100;
  const gB = growthB / 100;
  
  const valsA = [
    Math.round(priceA / Math.pow(1+gA, 2)),
    Math.round(priceA / (1+gA)),
    Math.round(priceA),
    Math.round(priceA * (1+gA)),
    Math.round(priceA * Math.pow(1+gA, 2))
  ];
  
  const valsB = [
    Math.round(priceB / Math.pow(1+gB, 2)),
    Math.round(priceB / (1+gB)),
    Math.round(priceB),
    Math.round(priceB * (1+gB)),
    Math.round(priceB * Math.pow(1+gB, 2))
  ];
  
  const maxPrice = Math.max(...valsA, ...valsB) * 1.1;
  const minPrice = Math.min(...valsA, ...valsB) * 0.9;
  const range = maxPrice - minPrice;
  
  const getY = (val) => 160 - ((val - minPrice) / range) * 130;
  const getX = (idx) => 60 + idx * 95;
  
  const pointsA = valsA.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const pointsB = valsB.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  
  const years = ["2022", "2023", "2024", "2025", "2026"];
  
  wrapper.innerHTML = `
    <svg viewBox="0 0 500 200" style="width:100%; height:100%;">
      <!-- Grids -->
      <line x1="50" y1="20" x2="450" y2="20" stroke="var(--border-color)" stroke-dasharray="4" />
      <line x1="50" y1="85" x2="450" y2="85" stroke="var(--border-color)" stroke-dasharray="4" />
      <line x1="50" y1="150" x2="450" y2="150" stroke="var(--border-color)" stroke-dasharray="4" />
      <line x1="50" y1="160" x2="450" y2="160" stroke="var(--border-color)" />
      
      <!-- Axis labels -->
      <text x="45" y="24" text-anchor="end" style="font-size: 9px; fill: var(--text-muted); font-weight:700;">₹${Math.round(maxPrice/100)*100}</text>
      <text x="45" y="89" text-anchor="end" style="font-size: 9px; fill: var(--text-muted); font-weight:700;">₹${Math.round((maxPrice+minPrice)/200)*100}</text>
      <text x="45" y="154" text-anchor="end" style="font-size: 9px; fill: var(--text-muted); font-weight:700;">₹${Math.round(minPrice/100)*100}</text>
      
      <!-- Years labels -->
      ${years.map((y, i) => `<text x="${getX(i)}" y="180" text-anchor="middle" style="font-size: 10px; fill: var(--text-secondary); font-weight: 700;">${y}</text>`).join('')}
      
      <!-- Line A (Primary) -->
      <polyline points="${pointsA}" fill="none" stroke="var(--primary)" stroke-width="3" style="transition: all 0.3s;" />
      <!-- Line B (Accent) -->
      <polyline points="${pointsB}" fill="none" stroke="var(--accent)" stroke-width="3" style="transition: all 0.3s;" />
      
      <!-- Plot circles -->
      ${valsA.map((v, i) => `<circle cx="${getX(i)}" cy="${getY(v)}" r="4" fill="var(--primary)" stroke="var(--bg-primary)" stroke-width="1.5" />`).join('')}
      ${valsB.map((v, i) => `<circle cx="${getX(i)}" cy="${getY(v)}" r="4" fill="var(--accent)" stroke="var(--bg-primary)" stroke-width="1.5" />`).join('')}
    </svg>
  `;
}


// ==========================================================================
// REAL-TIME GEOSPATIAL MAP SEARCH (PIN MAPPING)
// ==========================================================================
let currentViewMode = "list";
let isDraggingMap = false;
let mapStartX = 0, mapStartY = 0;
let mapCurrentX = -450, mapCurrentY = -500;
let mapScale = 1.0;

function switchViewMode(mode) {
  currentViewMode = mode;
  
  const listBtn = document.getElementById("view-mode-list");
  const mapBtn = document.getElementById("view-mode-map");
  const listGrid = document.getElementById("properties-results-container");
  const mapBox = document.getElementById("properties-map-container");
  
  if (!listBtn || !mapBtn || !listGrid || !mapBox) return;
  
  if (mode === "list") {
    listBtn.className = "btn btn-primary btn-sm";
    listBtn.style.cssText = "font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-xs); border: none; font-weight: 700;";
    mapBtn.className = "btn btn-secondary btn-sm";
    mapBtn.style.cssText = "font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-xs); background: none; border: none; color: var(--text-muted); font-weight: 700;";
    listGrid.style.display = "grid";
    mapBox.style.display = "none";
  } else {
    mapBtn.className = "btn btn-primary btn-sm";
    mapBtn.style.cssText = "font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-xs); border: none; font-weight: 700;";
    listBtn.className = "btn btn-secondary btn-sm";
    listBtn.style.cssText = "font-size: 11.5px; padding: 4px 10px; border-radius: var(--radius-xs); background: none; border: none; color: var(--text-muted); font-weight: 700;";
    listGrid.style.display = "none";
    mapBox.style.display = "block";
    
    initGeospatialMap();
    renderMapPins();
    setTimeout(centerMapOnPins, 50);
  }
}

const CITY_MAP_THEMES = {
  "Orai": {
    river: "M -100,500 C 300,520 600,300 900,420 C 1100,500 1300,600 1600,550",
    riverLabel: "SARAYU RIVER STREAM",
    riverLabelY: 525,
    parks: [
      { x: 250, y: 220, w: 180, h: 130, label: "RECREATION PARK" },
      { x: 850, y: 780, r: 95, label: "GREENVALE FOREST" }
    ],
    roads: [
      { d: "M 0,1100 Q 750,1150 1500,1050", label: "CITY BYPASS HIGHWAY", strokeWidth: 8, opacity: 0.25 },
      { d: "M 500,0 L 500,1500", label: "JAIL ROAD", strokeWidth: 5, opacity: 0.2 },
      { d: "M 0,550 L 1500,550", label: "STATION ROAD", strokeWidth: 5, opacity: 0.2 },
      { d: "M 0,350 L 1500,1150", label: "KONCH BYPASS", strokeWidth: 4, opacity: 0.2 }
    ]
  },
  "Lucknow": {
    river: "M -100,700 C 400,600 700,900 1000,750 C 1200,650 1400,800 1600,750",
    riverLabel: "GOMTI RIVER",
    riverLabelY: 725,
    parks: [
      { x: 100, y: 150, w: 250, h: 180, label: "JANESHWAR MISHRA PARK" },
      { x: 1000, y: 300, r: 110, label: "DR. AMBEDKAR PARK" }
    ],
    roads: [
      { d: "M 0,400 L 1500,400", label: "HAZRATGANJ MARG", strokeWidth: 6, opacity: 0.25 },
      { d: "M 650,0 L 650,1500", label: "GOMTI NAGAR BYPASS", strokeWidth: 6, opacity: 0.25 },
      { d: "M 0,900 Q 750,850 1500,950", label: "SHAHEED PATH BYPASS", strokeWidth: 9, opacity: 0.3 }
    ]
  },
  "Noida": {
    river: "M -100,300 C 300,400 500,200 800,350 C 1100,500 1300,400 1600,300",
    riverLabel: "YAMUNA RIVER",
    riverLabelY: 325,
    parks: [
      { x: 400, y: 800, w: 300, h: 150, label: "NOIDA BOTANICAL GARDEN" },
      { x: 1100, y: 600, r: 80, label: "SECTOR 50 PARK" }
    ],
    roads: [
      { d: "M 0,600 Q 750,700 1500,650", label: "NOIDA-GREATER NOIDA EXPRESSWAY", strokeWidth: 9, opacity: 0.3 },
      { d: "M 800,0 L 800,1500", label: "SECTOR 62 ROAD", strokeWidth: 5, opacity: 0.2 },
      { d: "M 0,1050 L 1500,1050", label: "DND FLYWAY", strokeWidth: 7, opacity: 0.25 }
    ]
  },
  "Kanpur": {
    river: "M -100,200 C 400,350 800,150 1100,300 C 1300,400 1500,300 1600,250",
    riverLabel: "GANGES RIVER",
    riverLabelY: 225,
    parks: [
      { x: 500, y: 700, w: 200, h: 200, label: "NANA RAO PARK" },
      { x: 100, y: 900, r: 90, label: "ALLEN FOREST ZOO" }
    ],
    roads: [
      { d: "M 0,500 L 1500,500", label: "MALL ROAD", strokeWidth: 6, opacity: 0.25 },
      { d: "M 700,0 L 700,1500", label: "GRAND TRUNK ROAD", strokeWidth: 8, opacity: 0.3 },
      { d: "M 0,1100 L 1500,1100", label: "BYPASS ROAD", strokeWidth: 5, opacity: 0.2 }
    ]
  },
  "Varanasi": {
    river: "M -100,800 C 300,700 600,900 900,800 C 1200,700 1400,950 1600,900",
    riverLabel: "GANGES RIVER",
    riverLabelY: 825,
    parks: [
      { x: 300, y: 200, w: 220, h: 120, label: "SARNATH DEER PARK" },
      { x: 900, y: 450, r: 85, label: "BHU GREEN CAMPUS" }
    ],
    roads: [
      { d: "M 0,600 L 1500,600", label: "ASSI GHAT ROAD", strokeWidth: 5, opacity: 0.25 },
      { d: "M 450,0 Q 750,750 1050,1500", label: "DASHASHWAMEDH PATH", strokeWidth: 6, opacity: 0.25 },
      { d: "M 0,1200 Q 750,1100 1500,1250", label: "VARANASI BYPASS", strokeWidth: 8, opacity: 0.3 }
    ]
  }
};

function getCityMapTheme(cityName) {
  const normCity = cityName.trim();
  if (CITY_MAP_THEMES[normCity]) {
    return CITY_MAP_THEMES[normCity];
  }
  
  // Dynamically generate a deterministic theme based on the city name string hash
  let hash = 0;
  for (let i = 0; i < normCity.length; i++) {
    hash += normCity.charCodeAt(i);
  }
  
  const riverCurveY1 = 300 + (hash % 400);
  const riverCurveY2 = 400 + ((hash * 3) % 400);
  const riverCurveY3 = 350 + ((hash * 7) % 400);
  
  const parkX = 200 + (hash % 600);
  const parkY = 200 + ((hash * 5) % 600);
  
  return {
    river: `M -100,${riverCurveY1} C 300,${riverCurveY2} 700,${riverCurveY3} 1100,${riverCurveY1} 1600,${riverCurveY2}`,
    riverLabel: `${normCity.toUpperCase()} RIVER`,
    riverLabelY: riverCurveY1 + 25,
    parks: [
      { x: parkX, y: parkY, w: 200, h: 140, label: `${normCity.toUpperCase()} PARK` }
    ],
    roads: [
      { d: `M 0,${500 + (hash % 300)} L 1500,${500 + (hash % 300)}`, label: `${normCity.toUpperCase()} ROAD`, strokeWidth: 6, opacity: 0.25 },
      { d: `M ${400 + ((hash * 2) % 400)},0 L ${400 + ((hash * 2) % 400)},1500`, label: `${normCity.toUpperCase()} BYPASS`, strokeWidth: 7, opacity: 0.25 }
    ]
  };
}

function initGeospatialMap() {
  const canvas = document.getElementById("map-vector-canvas");
  const pane = document.getElementById("map-search-pane");
  const container = document.getElementById("properties-map-container");
  if (!canvas || !pane || !container) return;
  
  // Draw city streets layout in SVG
  const selectedCity = document.getElementById("search-city").value;
  const theme = getCityMapTheme(selectedCity);
  
  // Custom styled roadmap grid based on active city
  let vectorHtml = `
    <svg width="1500" height="1500" viewBox="0 0 1500 1500" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top:0; left:0; width:100%; height:100%;">
      <!-- Background grid patterns -->
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--border-color)" stroke-width="0.7" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
      <!-- River / Waterbody -->
      <path d="${theme.river}" fill="none" stroke="#22d3ee" stroke-width="65" stroke-opacity="0.12" />
      <path d="${theme.river}" fill="none" stroke="#06b6d4" stroke-width="15" stroke-opacity="0.25" />
      
      <!-- Parks -->
      ${theme.parks.map(p => `
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10" fill="#10b981" fill-opacity="0.08" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4" />
      `).join('')}
      
      <!-- Roads -->
      ${theme.roads.map(r => `
        <path d="${r.d}" fill="none" stroke="var(--text-muted)" stroke-width="${r.strokeWidth}" opacity="${r.opacity}" />
      `).join('')}
      
      <!-- Locality Overlay Labels -->
      ${theme.parks.map(p => `
        <text x="${p.x + p.w / 2}" y="${p.y + p.h / 2 + 4}" fill="var(--text-muted)" font-size="12px" font-weight="800" opacity="0.4" text-anchor="middle">${p.label}</text>
      `).join('')}
      <text x="100" y="${theme.riverLabelY}" fill="#06b6d4" font-size="11px" font-weight="800" opacity="0.4" text-anchor="start">${theme.riverLabel}</text>
      ${theme.roads.map((r, i) => `
        <text x="750" y="${500 + i * 200}" fill="var(--text-muted)" font-size="11px" font-weight="800" opacity="0.4" text-anchor="middle">${r.label}</text>
      `).join('')}
    </svg>
  `;
  canvas.innerHTML = vectorHtml;
  
  // Set up dragging listeners
  const onStart = (clientX, clientY) => {
    isDraggingMap = true;
    mapStartX = clientX - mapCurrentX;
    mapStartY = clientY - mapCurrentY;
    container.style.cursor = "grabbing";
  };
  
  const onMove = (clientX, clientY) => {
    if (!isDraggingMap) return;
    mapCurrentX = clientX - mapStartX;
    mapCurrentY = clientY - mapStartY;
    
    // Bounds check to prevent dragging off canvas
    const margin = 300;
    const maxX = margin;
    const minX = container.clientWidth - 1500 * mapScale - margin;
    const maxY = margin;
    const minY = container.clientHeight - 1500 * mapScale - margin;
    
    mapCurrentX = Math.max(minX, Math.min(maxX, mapCurrentX));
    mapCurrentY = Math.max(minY, Math.min(maxY, mapCurrentY));
    
    updateMapTransform();
  };
  
  const onEnd = () => {
    isDraggingMap = false;
    container.style.cursor = "grab";
  };
  
  container.addEventListener("mousedown", (e) => onStart(e.clientX, e.clientY));
  document.addEventListener("mouseup", onEnd);
  container.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
  
  container.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX, e.touches[0].clientY));
  document.addEventListener("touchend", onEnd);
  container.addEventListener("touchmove", (e) => onMove(e.touches[0].clientX, e.touches[0].clientY));
  
  updateMapTransform();
}

function updateMapTransform() {
  const pane = document.getElementById("map-search-pane");
  if (pane) {
    pane.style.transform = `translate(${mapCurrentX}px, ${mapCurrentY}px) scale(${mapScale})`;
  }
}

function zoomMap(factor) {
  mapScale = Math.max(0.6, Math.min(2.0, mapScale * factor));
  updateMapTransform();
}

function resetMapTransform() {
  mapScale = 1.0;
  const container = document.getElementById("properties-map-container");
  if (container) {
    mapCurrentX = (container.clientWidth - 1500) / 2;
    mapCurrentY = (container.clientHeight - 1500) / 2;
  } else {
    mapCurrentX = -450;
    mapCurrentY = -500;
  }
  updateMapTransform();
  
  // Close tooltip
  const tooltip = document.getElementById("map-property-tooltip");
  if (tooltip) tooltip.style.display = "none";
}

function centerMapOnPins() {
  const container = document.getElementById("properties-map-container");
  if (!container) return;
  if (container.clientWidth === 0) {
    setTimeout(centerMapOnPins, 50);
    return;
  }
  
  const pins = document.querySelectorAll(".map-price-pin");
  if (pins.length > 0) {
    let sumX = 0, sumY = 0;
    pins.forEach(pin => {
      const x = parseFloat(pin.style.left) || 750;
      const y = parseFloat(pin.style.top) || 750;
      sumX += x;
      sumY += y;
    });
    
    const avgX = sumX / pins.length;
    const avgY = sumY / pins.length;
    
    mapScale = 1.0;
    mapCurrentX = (container.clientWidth / 2) - avgX;
    mapCurrentY = (container.clientHeight / 2) - avgY;
  } else {
    mapScale = 1.0;
    mapCurrentX = (container.clientWidth - 1500) / 2;
    mapCurrentY = (container.clientHeight - 1500) / 2;
  }
  updateMapTransform();
}

function getPropertyMapCoords(prop) {
  let x = 750;
  let y = 750;
  
  const locality = prop.locality.toLowerCase();
  
  if (locality.includes("patel")) { x = 300; y = 300; }
  else if (locality.includes("tulsi")) { x = 520; y = 240; }
  else if (locality.includes("jail")) { x = 400; y = 620; }
  else if (locality.includes("station")) { x = 680; y = 520; }
  else if (locality.includes("sharda")) { x = 780; y = 290; }
  else if (locality.includes("bajaria")) { x = 860; y = 480; }
  else if (locality.includes("sushil")) { x = 240; y = 750; }
  else if (locality.includes("gomti")) { x = 500; y = 420; }
  else if (locality.includes("hazrat")) { x = 750; y = 350; }
  else if (locality.includes("aliganj")) { x = 420; y = 620; }
  else if (locality.includes("indira")) { x = 820; y = 580; }
  else if (locality.includes("sector 62")) { x = 520; y = 380; }
  else if (locality.includes("sector 15")) { x = 740; y = 320; }
  else if (locality.includes("sector 50")) { x = 420; y = 680; }
  else if (locality.includes("sector 18")) { x = 800; y = 600; }
  else {
    let hash = 0;
    for (let i = 0; i < prop.id.length; i++) {
      hash += prop.id.charCodeAt(i);
    }
    x = 350 + (hash % 650);
    y = 250 + ((hash * 7) % 750);
  }
  
  return { x, y };
}

function renderMapPins() {
  const container = document.getElementById("map-pins-container");
  if (!container) return;
  
  const activeCity = document.getElementById("search-city").value;
  const rawProperties = window.PLATLO_DB.getProperties();
  
  // Run client filters matching list results
  const checkedPropTypes = Array.from(document.querySelectorAll(".filter-prop-type:checked")).map(cb => cb.value);
  const checkedBhks = Array.from(document.querySelectorAll(".filter-bhk:checked")).map(cb => parseInt(cb.value));
  const checkedFurnishing = Array.from(document.querySelectorAll(".filter-furnishing:checked")).map(cb => cb.value);
  const checkedParking = Array.from(document.querySelectorAll(".filter-parking:checked")).map(cb => cb.value);
  const priceMin = parseFloat(document.getElementById("filter-price-min").value) || 0;
  const priceMax = parseFloat(document.getElementById("filter-price-max").value) || Infinity;
  const localityQuery = document.getElementById("search-locality").value.toLowerCase().trim();
  
  const filtered = rawProperties.filter(prop => {
    if (prop.city.toLowerCase() !== activeCity.toLowerCase()) return false;
    if (prop.listing_type !== currentFilterType) return false;
    if (localityQuery && !prop.locality.toLowerCase().includes(localityQuery) && !prop.society.toLowerCase().includes(localityQuery)) return false;
    if (checkedPropTypes.length > 0 && !checkedPropTypes.includes(prop.property_type)) return false;
    if (checkedBhks.length > 0 && !checkedBhks.includes(prop.bedrooms)) return false;
    if (prop.price < priceMin || prop.price > priceMax) return false;
    if (checkedFurnishing.length > 0 && !checkedFurnishing.includes(prop.furnishing)) return false;
    if (checkedParking.length > 0 && !checkedParking.includes(prop.parking)) return false;
    return true;
  });
  
  container.innerHTML = filtered.map(prop => {
    const coords = getPropertyMapCoords(prop);
    const isRent = prop.listing_type === "rent";
    const shortPrice = isRent 
      ? `₹${(prop.price/1000).toFixed(0)}K` 
      : `₹${(prop.price >= 10000000 ? (prop.price/10000000).toFixed(1) + 'Cr' : (prop.price/100000).toFixed(0) + 'L')}`;
      
    return `
      <div class="map-price-pin" style="position: absolute; left: ${coords.x}px; top: ${coords.y}px; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer;" onclick="showMapPropertyTooltip('${prop.id}', ${coords.x}, ${coords.y}, event)">
        ${shortPrice}
      </div>
    `;
  }).join('');
}

function showMapPropertyTooltip(propertyId, x, y, event) {
  if (event) event.stopPropagation();
  const tooltip = document.getElementById("map-property-tooltip");
  if (!tooltip) return;
  
  const prop = window.PLATLO_DB.getProperties().find(p => p.id === propertyId);
  if (!prop) return;
  
  const isRent = prop.listing_type === "rent";
  const priceFormatted = isRent 
    ? `₹${prop.price.toLocaleString('en-IN')}/mo` 
    : `₹${(prop.price >= 10000000 ? (prop.price/10000000).toFixed(2) + ' Cr' : (prop.price/100000).toFixed(2) + ' L')}`;
  
  tooltip.innerHTML = `
    <div style="position: relative; display: flex; flex-direction: column; gap: 8px;">
      <button onclick="document.getElementById('map-property-tooltip').style.display='none'" style="position: absolute; top:-4px; right:-4px; background:none; border:none; color:var(--text-muted); font-size:16px; cursor:pointer; font-weight:bold;">&times;</button>
      <img src="${prop.images[0] || './images/property_1.jpg'}" style="width: 100%; height: 110px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
      <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px;" title="${prop.title}">${prop.title}</div>
      <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>${prop.locality}, ${prop.city}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <strong style="color: var(--primary); font-size: 14px;">${priceFormatted}</strong>
        <a href="./property.html?id=${prop.id}" class="btn btn-primary" style="font-size: 10.5px; padding: 4px 8px; font-weight: 700; border-radius: var(--radius-xs); height: auto;">View details</a>
      </div>
    </div>
  `;
  
  // Position tooltip relative to container boundaries
  tooltip.style.display = "block";
  tooltip.style.left = "20px";
  tooltip.style.bottom = "20px";
}

// Intercept applyFilters to also update map pins if map view is active
const originalApplyFilters = applyFilters;
applyFilters = async function() {
  await originalApplyFilters();
  if (currentViewMode === "map") {
    initGeospatialMap();
    renderMapPins();
    centerMapOnPins();
  }
};


// Global Exports extension
window.toggleLocalityCompare = toggleLocalityCompare;
window.switchCompareCity = switchCompareCity;
window.renderLocalityCompare = renderLocalityCompare;
window.toggleLocalityCompare = toggleLocalityCompare;

window.switchViewMode = switchViewMode;
window.zoomMap = zoomMap;
window.resetMapTransform = resetMapTransform;
window.showMapPropertyTooltip = showMapPropertyTooltip;
window.centerMapOnPins = centerMapOnPins;

document.addEventListener("DOMContentLoaded", () => {
  parseQueryParams();
  updateLocalityTags();
  initCompareFeature();
  // Brief timeout to let config loading establish first
  setTimeout(applyFilters, 100);
});
