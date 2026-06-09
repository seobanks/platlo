/* ==========================================================================
   PLATLO - PROPERTY POSTING PROCESS JS
   ========================================================================== */

let activeStep = 1;
const postData = {
  listing_type: "sell",
  property_type: "apartment",
  bedrooms: 2,
  furnishing: "semi-furnished",
  parking: "car",
  images: []
};

// ==========================================================================
// 1. FORM TOGGLES HANDLING
// ==========================================================================
function setPostListingType(type) {
  postData.listing_type = type;
  document.getElementById("btn-post-sell").classList.toggle("active", type === "sell");
  document.getElementById("btn-post-rent").classList.toggle("active", type === "rent");

  // Adjust pricing label context
  const priceLabel = document.getElementById("label-post-price");
  if (priceLabel) {
    priceLabel.textContent = type === "rent" ? "Expected Monthly Rent (₹)" : "Expected Price (₹)";
  }
  updateSEOPreview();
}

function setPostPropertyType(type) {
  postData.property_type = type;
  const types = ["apartment", "house", "plot", "commercial"];
  types.forEach(t => {
    const btn = document.getElementById(`type-${t}`);
    if (btn) btn.classList.toggle("active", t === type);
  });

  // Hide BHKbedrooms picker if Plot or Commercial is selected
  const bhkGroup = document.getElementById("grp-bhk-toggle");
  if (bhkGroup) {
    if (type === "plot" || type === "commercial") {
      bhkGroup.style.display = "none";
      postData.bedrooms = 0;
    } else {
      bhkGroup.style.display = "flex";
      postData.bedrooms = 2; // reset default
    }
  }
  updateSEOPreview();
}

function setPostBhk(val) {
  postData.bedrooms = val;
  const bhkButtons = document.querySelectorAll("#grp-bhk-toggle .toggle-btn");
  bhkButtons.forEach((btn, index) => {
    btn.classList.toggle("active", index === (val - 1));
  });
  updateSEOPreview();
}

function setPostFurnishing(val) {
  postData.furnishing = val;
  const map = { unfurnished: "un", "semi-furnished": "semi", "fully-furnished": "fully" };
  for (let key in map) {
    const btn = document.getElementById(`furnish-${map[key]}`);
    if (btn) btn.classList.toggle("active", key === val);
  }
  updateSEOPreview();
}

function setPostParking(val) {
  postData.parking = val;
  const map = { none: "none", bike: "bike", car: "car", both: "both" };
  for (let key in map) {
    const btn = document.getElementById(`park-${map[key]}`);
    if (btn) btn.classList.toggle("active", key === val);
  }
  updateSEOPreview();
}

// ==========================================================================
// 2. DYNAMIC SEO AUTO GENERATION & GOOGLE PREVIEW
// ==========================================================================
function updateSEOPreview() {
  const city = document.getElementById("post-city").value;
  const locality = document.getElementById("post-locality").value.trim() || "[Locality]";
  const society = document.getElementById("post-society").value.trim();
  const price = parseFloat(document.getElementById("post-price").value) || 0;
  const area = document.getElementById("post-area").value || "[Area]";

  const isRent = postData.listing_type === "rent";
  const typeLabel = postData.property_type.charAt(0).toUpperCase() + postData.property_type.slice(1);
  const specLabel = postData.bedrooms > 0 ? `${postData.bedrooms} BHK` : `Commercial/Plot`;

  // 1. Format dynamic title tag
  const titleText = `${specLabel} ${typeLabel} for ${isRent ? 'Rent' : 'Sale'} in ${locality}, ${city} | PLATLO`;
  document.getElementById("seo-preview-title").textContent = titleText;

  // 2. Format pricing labels
  let priceStr = "";
  if (price > 0) {
    priceStr = isRent 
      ? `₹${price.toLocaleString('en-IN')}/mo`
      : `₹${(price >= 10000000 ? (price/10000000).toFixed(2) + ' Cr' : (price/100000).toFixed(2) + ' L')}`;
  } else {
    priceStr = "Attractive Pricing";
  }

  // 3. Format dynamic description tag
  const furnishingLabel = postData.furnishing.replace("-furnished", "");
  const societyText = society ? ` in ${society},` : "";
  const descText = `${specLabel} ${typeLabel} available for ${postData.listing_type}${societyText} ${locality}, ${city}. Features: ${area} sq ft carpet area, ${furnishingLabel} state, and ${postData.parking} parking. Listing Price: ${priceStr}. Zero Brokerage direct deal.`;
  document.getElementById("seo-preview-desc").textContent = descText;
}

// Auto AI Description generator
function generateAIDescription() {
  const city = document.getElementById("post-city").value;
  const locality = document.getElementById("post-locality").value.trim();
  const society = document.getElementById("post-society").value.trim();
  const area = document.getElementById("post-area").value;
  const price = document.getElementById("post-price").value;

  if (!locality || !society || !area || !price) {
    showToast("Please fill location, area, and price details first.", "warning");
    return;
  }

  const isRent = postData.listing_type === "rent";
  const typeLabel = postData.property_type.charAt(0).toUpperCase() + postData.property_type.slice(1);
  const bhkText = postData.bedrooms > 0 ? `${postData.bedrooms} BHK` : "";
  const furnishText = postData.furnishing.replace("-furnished", " furnished");
  const parkingText = postData.parking === "none" ? "no dedicated" : `${postData.parking} parking`;

  const desc = `Ready to move in, extremely spacious ${bhkText} ${typeLabel} located in the premium community of ${society}, ${locality}, ${city}.\n\nThis home offers a generous carpet area of ${area} sq.ft, features excellent natural ventilation, comes in a ${furnishText} condition, and includes ${parkingText} space.\n\nLocated in a clean and peaceful locality close to schools, markets, and main transit lines. High security gates and continuous water supply. Direct owner listing - absolutely zero brokerage fees. Get in touch directly to book a viewing today!`;

  document.getElementById("post-description").value = desc;
  updateSEOPreview();
}

// ==========================================================================
// 3. FILE SELECTION / SIMULATED UPLOADING
// ==========================================================================
function triggerFileUpload() {
  document.getElementById("file-uploader").click();
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  const container = document.getElementById("preview-container");
  
  files.forEach(file => {
    // Generate object URL for preview
    const objectUrl = URL.createObjectURL(file);
    postData.images.push(objectUrl);
    
    const preview = document.createElement("div");
    preview.className = "preview-item";
    preview.innerHTML = `
      <img src="${objectUrl}" alt="Preview">
      <button class="preview-remove" onclick="removePreview('${objectUrl}', this)">&times;</button>
    `;
    container.appendChild(preview);
  });
  showToast(`${files.length} photos selected.`);
}

function removePreview(url, btnEl) {
  postData.images = postData.images.filter(img => img !== url);
  btnEl.parentElement.remove();
}

// ==========================================================================
// 4. WIZARD STEP SYSTEM & FORM VALIDATIONS
// ==========================================================================
function moveStep(direction) {
  if (direction === 1 && !validateStep(activeStep)) {
    return; // Block navigation on invalid input
  }

  activeStep += direction;

  // Render active layout elements
  document.querySelectorAll(".wizard-step").forEach((step, index) => {
    step.classList.toggle("active", index === (activeStep - 1));
  });

  // Progress nodes update
  document.querySelectorAll(".progress-node").forEach((node, index) => {
    const nodeIndex = index + 1;
    node.classList.toggle("active", nodeIndex === activeStep);
    node.classList.toggle("completed", nodeIndex < activeStep);
  });

  // Progress bar fill width update
  const percent = ((activeStep - 1) / 3) * 100;
  document.getElementById("wizard-progress-bar").style.width = `${percent}%`;

  // Buttons UI adjustments
  const btnPrev = document.getElementById("btn-wizard-prev");
  const btnNext = document.getElementById("btn-wizard-next");

  btnPrev.style.visibility = activeStep === 1 ? "hidden" : "visible";
  btnNext.textContent = activeStep === 4 ? "Submit & Post" : "Next Step";

  if (activeStep === 5) {
    activeStep = 4; // cap
    submitPropertyListing();
  }
}

// Check inputs validity
function validateStep(step) {
  if (step === 2) {
    const locality = document.getElementById("post-locality").value.trim();
    const society = document.getElementById("post-society").value.trim();
    const address = document.getElementById("post-address").value.trim();

    if (!locality || !society || !address) {
      showToast("Please fill all location fields.", "error");
      return false;
    }
  } else if (step === 3) {
    const area = parseFloat(document.getElementById("post-area").value);
    const price = parseFloat(document.getElementById("post-price").value);

    if (isNaN(area) || area <= 0) {
      showToast("Please enter a valid carpet area.", "error");
      return false;
    }
    if (isNaN(price) || price <= 0) {
      showToast("Please enter a valid price.", "error");
      return false;
    }
  }
  return true;
}

// ==========================================================================
// 5. DATABASE SUBMISSIONS (SUPABASE OR MOCK)
// ==========================================================================
async function submitPropertyListing() {
  // Check auth first
  const user = window.PLATLO.currentUser;
  if (!user) {
    showToast("Please login or create an account to post your property.", "info");
    openAuthModal();
    return;
  }

  // Retrieve values
  const title = document.getElementById("seo-preview-title").textContent;
  const description = document.getElementById("post-description").value.trim();
  const price = parseFloat(document.getElementById("post-price").value);
  const carpet_area = parseFloat(document.getElementById("post-area").value);
  const city = document.getElementById("post-city").value;
  const locality = document.getElementById("post-locality").value.trim();
  const society = document.getElementById("post-society").value.trim();
  const address = document.getElementById("post-address").value.trim();
  const bathrooms = parseInt(document.getElementById("post-bathrooms").value) || 0;
  const floor = parseInt(document.getElementById("post-floor").value) || 0;
  const total_floors = parseInt(document.getElementById("post-total-floors").value) || 1;
  const contact_name = document.getElementById("post-contact-name").value.trim() || user.name;
  const contact_phone = document.getElementById("post-contact-phone").value.trim() || user.phone;
  const contact_email = document.getElementById("post-contact-email").value.trim() || user.email;

  if (!description) {
    showToast("Please enter a description or use the auto writer.", "error");
    return;
  }

  // Pre-seed image selections if uploader is empty
  const defaultImages = [
    "./images/property_1.jpg",
    "./images/property_2.jpg",
    "./images/property_3.jpg",
    "./images/property_4.jpg"
  ];
  const finalImages = postData.images.length > 0 
    ? postData.images 
    : [defaultImages[Math.floor(Math.random() * 4)]];

  const payload = {
    title,
    description,
    listing_type: postData.listing_type,
    property_type: postData.property_type,
    price,
    bedrooms: postData.bedrooms,
    bathrooms,
    carpet_area,
    city,
    locality,
    society,
    address,
    furnishing: postData.furnishing,
    parking: postData.parking,
    floor,
    total_floors,
    images: finalImages,
    contact_name,
    contact_phone,
    contact_email,
    views_count: 0,
    status: "active",
  };

  // Submit to selected database
  if (window.PLATLO.isMock) {
    payload.id = "prop-" + Math.random().toString(36).substr(2, 9);
    payload.owner_id = user.id;
    payload.created_at = new Date().toISOString();
    payload.updated_at = new Date().toISOString();
    
    window.PLATLO_DB.saveProperty(payload);
    showToast("Property posted successfully! View on dashboard.");
    
    // Redirect to Dashboard
    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 1500);
  } else {
    try {
      payload.owner_id = user.id;
      const { data, error } = await window.PLATLO.supabase
        .from("properties")
        .insert(payload);
      
      if (error) throw error;
      showToast("Property posted successfully!", "success");
      
      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 1500);
    } catch (err) {
      console.error("Supabase failed, fallback saving locally.", err);
      // Fallback local save
      payload.id = "prop-" + Math.random().toString(36).substr(2, 9);
      payload.owner_id = user.id;
      payload.created_at = new Date().toISOString();
      payload.updated_at = new Date().toISOString();
      window.PLATLO_DB.saveProperty(payload);
      showToast("Property posted successfully! (Saved in local session)");
      
      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 1500);
    }
  }
}

// Auto fill contact fields with logged-in user info
function autoFillUserFields() {
  const user = window.PLATLO.currentUser;
  if (!user) return;

  const inputName = document.getElementById("post-contact-name");
  const inputPhone = document.getElementById("post-contact-phone");
  const inputEmail = document.getElementById("post-contact-email");

  if (inputName && !inputName.value) inputName.value = user.name;
  if (inputPhone && !inputPhone.value) inputPhone.value = user.phone || "";
  if (inputEmail && !inputEmail.value) inputEmail.value = user.email || "";
}

// Drag & Drop Setup
function setupDragAndDrop() {
  const dropzone = document.getElementById("dropzone");
  if (!dropzone) return;

  ["dragenter", "dragover"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    }, false);
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    }, false);
  });

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    // Trigger simulated select
    const fileInput = document.getElementById("file-uploader");
    fileInput.files = files;
    
    // Call selection handler manually
    const event = { target: { files } };
    handleFileSelect(event);
  }, false);
}

// Listen for updates when authentication status changes
document.addEventListener("platloAuthChange", () => {
  autoFillUserFields();
});

// AI Paste Auto-fill parser
function applyAIPasteAutofill() {
  const input = document.getElementById("ai-paste-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    showToast("Please paste some text first.", "warning");
    return;
  }

  const q = text.toLowerCase();

  // 1. Transaction Type
  if (q.includes("rent") || q.includes("rentals") || q.includes("lease") || q.includes("tenant")) {
    setPostListingType("rent");
  } else if (q.includes("sell") || q.includes("sale") || q.includes("buy") || q.includes("owner") || q.includes("crore") || q.includes("lakh") || q.includes("lacs")) {
    setPostListingType("sell");
  }

  // 2. Property Type
  if (q.includes("apartment") || q.includes("flat") || q.includes("multi-family")) {
    setPostPropertyType("apartment");
  } else if (q.includes("house") || q.includes("villa") || q.includes("duplex") || q.includes("bungalow") || q.includes("duplex house")) {
    setPostPropertyType("house");
  } else if (q.includes("plot") || q.includes("land") || q.includes("site")) {
    setPostPropertyType("plot");
  } else if (q.includes("commercial") || q.includes("shop") || q.includes("office") || q.includes("showroom")) {
    setPostPropertyType("commercial");
  }

  // 3. BHK Bedrooms
  let bedrooms = 2; // default
  if (q.includes("1 bhk") || q.includes("1bhk") || q.includes("1 bedroom") || q.includes("one bedroom")) bedrooms = 1;
  if (q.includes("2 bhk") || q.includes("2bhk") || q.includes("2 bedroom") || q.includes("two bedroom")) bedrooms = 2;
  if (q.includes("3 bhk") || q.includes("3bhk") || q.includes("3 bedroom") || q.includes("three bedroom")) bedrooms = 3;
  if (q.includes("4 bhk") || q.includes("4bhk") || q.includes("4 bedroom") || q.includes("four bedroom") || q.includes("4+ bhk")) bedrooms = 4;
  setPostBhk(bedrooms);

  // 4. Locality & Society detection
  const localities = ["Patel Nagar", "Tulsi Nagar", "Jail Road", "Station Road", "Sharda Nagar", "Bajaria"];
  let foundLocality = "";
  for (const loc of localities) {
    if (q.includes(loc.toLowerCase())) {
      foundLocality = loc;
      break;
    }
  }
  if (foundLocality) {
    document.getElementById("post-locality").value = foundLocality;
    document.getElementById("post-society").value = foundLocality + " Colony";
    document.getElementById("post-address").value = "Near " + foundLocality + " Main Road";
  }

  // 5. Carpet Area (e.g. "1500 sq ft", "1200 sqft", "area is 950")
  const areaMatch = q.match(/(\d+)\s*(?:sq\s*ft|sqft|square\s*feet|carpet\s*area|area)/i);
  if (areaMatch) {
    document.getElementById("post-area").value = parseFloat(areaMatch[1]);
  }

  // 6. Expected Price / Rent
  const priceKeywords = /(?:price|rent|cost|rate|asking|of|for)\s*(?:rs\.?)?\s*([\d,]+)\s*(lakh|lakhs|lacs|lac|k|thousand|cr|crore)?/i;
  const priceMatch = q.match(priceKeywords);
  if (priceMatch) {
    let num = parseFloat(priceMatch[1].replace(/,/g, ''));
    const unit = priceMatch[2] ? priceMatch[2].toLowerCase() : "";

    if (unit.includes("lakh") || unit.includes("lac")) {
      num *= 100000;
    } else if (unit.includes("k") || unit.includes("thousand")) {
      num *= 1000;
    } else if (unit.includes("crore") || unit.includes("cr")) {
      num *= 10000000;
    } else {
      if (num < 1000) {
        if (postData.listing_type === "rent") {
          num *= 1000;
        } else {
          num *= 100000;
        }
      }
    }
    document.getElementById("post-price").value = num;
  } else {
    // try direct matches of large numbers
    const directNumMatch = q.match(/(?:rs\.?)?\s*([1-9]\d{3,})/gi);
    if (directNumMatch) {
      let num = parseFloat(directNumMatch[0].replace(/[^\d]/g, ''));
      document.getElementById("post-price").value = num;
    }
  }

  // 7. Furnishing status
  if (q.includes("semi-furnished") || q.includes("semi furnished")) {
    setPostFurnishing("semi-furnished");
  } else if (q.includes("fully-furnished") || q.includes("fully furnished") || q.includes("furnished")) {
    setPostFurnishing("fully-furnished");
  } else if (q.includes("unfurnished") || q.includes("empty") || q.includes("bare")) {
    setPostFurnishing("unfurnished");
  }

  // 8. Parking
  if (q.includes("car parking") || q.includes("car park")) {
    setPostParking("car");
  } else if (q.includes("bike parking")) {
    setPostParking("bike");
  } else if (q.includes("both parking") || (q.includes("car") && q.includes("bike") && q.includes("parking"))) {
    setPostParking("both");
  } else if (q.includes("no parking")) {
    setPostParking("none");
  }

  // 9. Contact Info (Name and Phone)
  const phoneMatch = q.match(/(?:\+91[\s-]?)?([6-9]\d{4}\s*\d{5}|[6-9]\d{9})/);
  if (phoneMatch) {
    document.getElementById("post-contact-phone").value = phoneMatch[0].replace(/\s/g, '');
  }
  
  const nameKeywords = /(?:contact|owner|name|call|ask for)\s+([a-z]+)/i;
  const nameMatch = q.match(nameKeywords);
  if (nameMatch) {
    const parsedName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
    document.getElementById("post-contact-name").value = parsedName;
  }

  // Write parsed description to description textarea
  document.getElementById("post-description").value = text;

  updateSEOPreview();
  showToast("AI successfully parsed text and filled forms!", "success");
  
  // Transition wizard step to review configuration details (Step 3)
  setTimeout(() => {
    moveStep(1); // go to step 2
    setTimeout(() => {
      moveStep(1); // go to step 3
    }, 400);
  }, 1000);
}

// Initialize logic
window.setPostListingType = setPostListingType;
window.setPostPropertyType = setPostPropertyType;
window.setPostBhk = setPostBhk;
window.setPostFurnishing = setPostFurnishing;
window.setPostParking = setPostParking;
window.updateSEOPreview = updateSEOPreview;
window.generateAIDescription = generateAIDescription;
window.triggerFileUpload = triggerFileUpload;
window.handleFileSelect = handleFileSelect;
window.removePreview = removePreview;
window.moveStep = moveStep;
window.applyAIPasteAutofill = applyAIPasteAutofill;

document.addEventListener("DOMContentLoaded", () => {
  updateSEOPreview();
  setupDragAndDrop();
  autoFillUserFields();
});
