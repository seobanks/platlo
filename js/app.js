/* ==========================================================================
   PLATLO - CORE APPLICATION JS
   ========================================================================== */

// Global Application State
window.PLATLO = {
  isMock: true,
  currentUser: null,
  supabase: null
};

// Check and Initialize Database Source (Supabase or Mock LocalStorage)
function initDatabase() {
  const cfg = window.PLATLO_CONFIG;
  const isDefaultUrl = !cfg || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("your-project-id");
  const isDefaultKey = !cfg || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("your-anon-key");

  if (isDefaultUrl || isDefaultKey) {
    console.warn("PLATLO: Supabase keys not set. Falling back to local Mock Database (localStorage).");
    window.PLATLO.isMock = true;
    initMockDatabase();
  } else {
    try {
      // Initialize Supabase Client via CDN global
      if (window.supabase) {
        window.PLATLO.supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        window.PLATLO.isMock = false;
        console.log("PLATLO: Successfully connected to Supabase Database.");
        
        // Listen to Auth state changes
        window.PLATLO.supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            window.PLATLO.currentUser = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata.full_name || "User",
              phone: session.user.user_metadata.phone || ""
            };
          } else {
            window.PLATLO.currentUser = null;
          }
          updateHeaderAuthUI();
          // Dispatch event to page-specific scripts to reload data if needed
          document.dispatchEvent(new CustomEvent("platloAuthChange"));
        });
      } else {
        throw new Error("Supabase library not loaded from CDN.");
      }
    } catch (err) {
      console.error("PLATLO: Supabase initialization failed. Falling back to Mock Database.", err);
      window.PLATLO.isMock = true;
      initMockDatabase();
    }
  }
}

// ==========================================================================
// MOCK DATABASE IMPLEMENTATION (LocalStorage)
// ==========================================================================
const MOCK_PROPERTIES_SEED = [
  {
    id: "prop-1",
    title: "Modern 3 BHK Independent House in Patel Nagar",
    description: "Beautiful independent residential house located in Patel Nagar, Orai. Very spacious rooms, modern bathrooms, marble flooring, and 24/7 municipal water supply. Walking distance from the main market and school facilities. Ideal for families wanting a peaceful neighborhood.",
    listing_type: "rent",
    property_type: "house",
    price: 9500,
    bedrooms: 3,
    bathrooms: 2,
    balconies: 1,
    carpet_area: 1500,
    city: "Orai",
    locality: "Patel Nagar",
    address: "Patel Nagar, Near Raj Palace, Orai",
    society: "Patel Nagar Residential Society",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_1.jpg", "./images/property_2.jpg"],
    contact_name: "Gaurav Rajpoot",
    contact_phone: "+91 98765 43210",
    contact_email: "gaurav@platlo.com",
    views_count: 142,
    status: "active",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-2",
    title: "Premium 2 BHK House for Rent near Station Road",
    description: "Ready to move in 2 BHK independent floor located in Tulsi Nagar near Orai Railway Station. Clean environment, modular kitchen fittings, tiled bathrooms, and dedicated space for bike parking. Excellent connectivity to local transit hubs.",
    listing_type: "rent",
    property_type: "house",
    price: 6500,
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1,
    carpet_area: 950,
    city: "Orai",
    locality: "Tulsi Nagar",
    address: "Tulsi Nagar Lane 3, near Railway Station Road, Orai",
    society: "Tulsi Nagar Colony",
    furnishing: "semi-furnished",
    parking: "bike",
    floor: 1,
    total_floors: 2,
    images: ["./images/property_2.jpg", "./images/property_1.jpg"],
    contact_name: "Rahul Verma",
    contact_phone: "+91 98989 77777",
    contact_email: "rahul@platlo.com",
    views_count: 94,
    status: "active",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-3",
    title: "Spacious Residential Plot for Sale in Jail Road Area",
    description: "West-facing 1800 sq.ft residential plot located in a fast-developing colony on Jail Road, Orai. Fully clear-titled land, adjacent to a 30-foot wide asphalt road. Instant registry, excellent electricity and water connection lines. Great investment opportunity for building your dream home.",
    listing_type: "sell",
    property_type: "plot",
    price: 1850000,
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    carpet_area: 1800,
    city: "Orai",
    locality: "Jail Road",
    address: "Jail Road, near Sharda Nagar Extension, Orai",
    society: "Sharda Colony Phase 2",
    furnishing: "unfurnished",
    parking: "none",
    floor: 0,
    total_floors: 0,
    images: ["./images/property_3.jpg", "./images/property_4.jpg"],
    contact_name: "Aisha Sharma",
    contact_phone: "+91 99998 88888",
    contact_email: "aisha@platlo.com",
    views_count: 389,
    status: "active",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-4",
    title: "Commercial Shop Space for Sale in Main Bajaria Market",
    description: "Prime retail commercial shop space located in the bustling business hub of Bajaria, Orai. High visibility, glass front, fitted electric meters, and immediate occupancy. Perfect location for retail, clinic, boutique, or office branch.",
    listing_type: "sell",
    property_type: "commercial",
    price: 3500000,
    bedrooms: 0,
    bathrooms: 1,
    balconies: 0,
    carpet_area: 450,
    city: "Orai",
    locality: "Bajaria",
    address: "Main Bazaar Road, Bajaria, Orai",
    society: "Bajaria Market Complex",
    furnishing: "fully-furnished",
    parking: "bike",
    floor: 0,
    total_floors: 3,
    images: ["./images/property_4.jpg", "./images/property_3.jpg"],
    contact_name: "Vikram Malhotra",
    contact_phone: "+91 95555 44444",
    contact_email: "vikram@platlo.com",
    views_count: 215,
    status: "active",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-5",
    title: "Newly Built 3 BHK Duplex House in Sharda Nagar",
    description: "Luxurious 3 BHK newly constructed duplex house in the upscale Sharda Nagar locality of Orai. Features contemporary design, parking for 1 SUV, modular kitchen, balcony with park view, and excellent ventilation. Direct-owner listing with clear titles.",
    listing_type: "sell",
    property_type: "house",
    price: 5800000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    carpet_area: 1650,
    city: "Orai",
    locality: "Sharda Nagar",
    address: "Sharda Nagar, near District Hospital Road, Orai",
    society: "Sharda Nagar Gated Colony",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_3.jpg", "./images/property_2.jpg"],
    contact_name: "Sneha Patil",
    contact_phone: "+91 91234 56789",
    contact_email: "sneha@platlo.com",
    views_count: 73,
    status: "active",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-6",
    title: "Residential Land / Plot for Sale in Sushil Nagar",
    description: "East-facing 900 sq.ft residential plot available for sale in Sushil Nagar, Orai. Clean title deed, immediate registry, and boundary wall already constructed. Located in a developed colony with water and electricity connections already available. Very peaceful neighborhood.",
    listing_type: "sell",
    property_type: "plot",
    price: 1450000,
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    carpet_area: 900,
    city: "Orai",
    locality: "Sushil Nagar",
    address: "Sushil Nagar Phase 1, near main road, Orai",
    society: "Sushil Nagar Residency",
    furnishing: "unfurnished",
    parking: "none",
    floor: 0,
    total_floors: 0,
    images: ["./images/property_3.jpg", "./images/property_4.jpg"],
    contact_name: "Ravi Dwivedi",
    contact_phone: "+91 94151 22222",
    contact_email: "ravi.dwivedi@example.com",
    views_count: 85,
    status: "active",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-7",
    title: "Newly Built 2 BHK House for Rent in Patel Nagar",
    description: "Spacious 2 BHK ground floor independent house portion for rent in Patel Nagar, Orai. Comes with modular kitchen fittings, semi-furnished wardrobes, large tiled bathrooms, and 24-hour water supply. Very close to Raj Palace and local markets. Families preferred.",
    listing_type: "rent",
    property_type: "house",
    price: 10000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    carpet_area: 1200,
    city: "Orai",
    locality: "Patel Nagar",
    address: "Patel Nagar Lane 5, near Raj Palace, Orai",
    society: "Patel Nagar Gated Society",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_1.jpg", "./images/property_2.jpg"],
    contact_name: "Amit Gupta",
    contact_phone: "+91 91400 55555",
    contact_email: "amit.gupta@example.com",
    views_count: 112,
    status: "active",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-8",
    title: "Premium 1800 Sq.Ft Plot for Sale in Patel Nagar Extension",
    description: "Excellent investment opportunity! A prime 1800 sq.ft residential plot for sale in Patel Nagar Extension, Orai. East facing, 30 ft road connectivity, municipal approvals cleared, ready for instant construction and registry. High resale potential.",
    listing_type: "sell",
    property_type: "plot",
    price: 2400000,
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    carpet_area: 1800,
    city: "Orai",
    locality: "Patel Nagar",
    address: "Patel Nagar Ext, Block C, Orai",
    society: "Patel Nagar Developer Zone",
    furnishing: "unfurnished",
    parking: "none",
    floor: 0,
    total_floors: 0,
    images: ["./images/property_4.jpg", "./images/property_3.jpg"],
    contact_name: "Shyam Sundar",
    contact_phone: "+91 93361 88888",
    contact_email: "shyam@example.com",
    views_count: 174,
    status: "active",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-9",
    title: "Beautiful 3 BHK Duplex House for Sale in Sushil Nagar",
    description: "Direct Owner listing! Newly constructed 3 BHK duplex house for sale in the premium location of Sushil Nagar, Orai. High-end finishes, marble flooring, modular kitchen, spacious balconies, SUV parking space, and private terrace. Close to schools and hospitals.",
    listing_type: "sell",
    property_type: "house",
    price: 4200000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    carpet_area: 1500,
    city: "Orai",
    locality: "Sushil Nagar",
    address: "Sushil Nagar Colony, Lane 2, Orai",
    society: "Sushil Nagar Duplexes",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_3.jpg", "./images/property_1.jpg"],
    contact_name: "Mahendra Singh",
    contact_phone: "+91 88877 66666",
    contact_email: "msingh@example.com",
    views_count: 231,
    status: "active",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-10",
    title: "Prime Commercial Shop Space for Rent on Station Road",
    description: "Fully commercial ground floor shop space available for lease/rent on busy Station Road, Orai. Size is 350 sq ft, fitted with iron shutters, tiled floors, glass display frontage, and private washroom. High footfall area, perfect for doctor's clinic, pharmacy, salon, or showroom branch.",
    listing_type: "rent",
    property_type: "commercial",
    price: 12000,
    bedrooms: 0,
    bathrooms: 1,
    balconies: 0,
    carpet_area: 350,
    city: "Orai",
    locality: "Station Road",
    address: "Station Road, near Railway Crossing, Orai",
    society: "Station Road Business Point",
    furnishing: "fully-furnished",
    parking: "bike",
    floor: 0,
    total_floors: 3,
    images: ["./images/property_4.jpg", "./images/property_2.jpg"],
    contact_name: "Karan Johar",
    contact_phone: "+91 99351 99999",
    contact_email: "karan@example.com",
    views_count: 156,
    status: "active",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-11",
    title: "1 BHK Flat portion for Rent in Lahariya Pura",
    description: "Budget-friendly 1 BHK independent flat portion available for rent in Lahariya Pura, Orai. Unfurnished unit on ground floor, 550 sq.ft carpet area, suitable for students, bachelors, or small families. 24/7 municipal water supply and bike parking space.",
    listing_type: "rent",
    property_type: "apartment",
    price: 4000,
    bedrooms: 1,
    bathrooms: 1,
    balconies: 0,
    carpet_area: 550,
    city: "Orai",
    locality: "Lahariya Pura",
    address: "Lahariya Pura Near Government School, Orai",
    society: "Lahariya Pura Housing",
    furnishing: "unfurnished",
    parking: "bike",
    floor: 0,
    total_floors: 1,
    images: ["./images/property_2.jpg", "./images/property_1.jpg"],
    contact_name: "Vijay Laxmi",
    contact_phone: "+91 94520 11111",
    contact_email: "vijay@example.com",
    views_count: 51,
    status: "active",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-12",
    title: "Luxurious 4 BHK Independent Villa for Sale on Konch Road",
    description: "Premium double-storey 4 BHK independent villa for sale on Konch Road, Orai. Beautiful front lawn, modular kitchen with premium teak wood fittings, 4 spacious bedrooms with attached tiled bathrooms, private terrace, and secure gated community. Double car parking space.",
    listing_type: "sell",
    property_type: "house",
    price: 6500000,
    bedrooms: 4,
    bathrooms: 4,
    balconies: 3,
    carpet_area: 2400,
    city: "Orai",
    locality: "Konch Road",
    address: "Konch Road Gated Colony, near bypass, Orai",
    society: "Rajlaxmi Gated Estates",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_3.jpg", "./images/property_1.jpg"],
    contact_name: "Anil Tripathi",
    contact_phone: "+91 94500 88888",
    contact_email: "anil@example.com",
    views_count: 142,
    status: "active",
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-13",
    title: "Premium Commercial Office Space for Lease on Jail Road",
    description: "Ready-to-occupy fully furnished 800 sq.ft commercial office space available for lease on Jail Road, Orai. Ideal for banks, corporate offices, consultancies, or diagnostic centers. Features 2 cabins, 8 workstations, reception desk, washroom, and power backup.",
    listing_type: "rent",
    property_type: "commercial",
    price: 18000,
    bedrooms: 0,
    bathrooms: 1,
    balconies: 0,
    carpet_area: 800,
    city: "Orai",
    locality: "Jail Road",
    address: "Jail Road Main Crossing, near Sharda Nagar, Orai",
    society: "Business Heights Complex",
    furnishing: "fully-furnished",
    parking: "car",
    floor: 1,
    total_floors: 4,
    images: ["./images/property_4.jpg", "./images/property_3.jpg"],
    contact_name: "Deepak Chaurasia",
    contact_phone: "+91 99180 77777",
    contact_email: "deepak@example.com",
    views_count: 189,
    status: "active",
    created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-14",
    title: "Prime 1500 Sq.Ft Residential Plot for Sale on Rath Road",
    description: "East-facing 1500 sq.ft residential plot available for sale on Rath Road, Orai. Clear title deeds, instant registry, situated adjacent to a local community park. Located within a highly developed residential pocket with 30 ft asphalt road frontage.",
    listing_type: "sell",
    property_type: "plot",
    price: 2250000,
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    carpet_area: 1500,
    city: "Orai",
    locality: "Rath Road",
    address: "Rath Road Colony Phase 2, Orai",
    society: "Rath Road Parkview Colony",
    furnishing: "unfurnished",
    parking: "none",
    floor: 0,
    total_floors: 0,
    images: ["./images/property_3.jpg", "./images/property_4.jpg"],
    contact_name: "Pushpendra Sahu",
    contact_phone: "+91 94510 55555",
    contact_email: "pushpendra@example.com",
    views_count: 98,
    status: "active",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-15",
    title: "Beautiful 2 BHK Duplex House for Sale in Sharda Nagar",
    description: "Direct owner listing! Modern 2 BHK independent duplex house for sale in Sharda Nagar, Orai. Semi-furnished wardrobes, modular kitchen fittings, marble flooring, 2 spacious balconies, and 24/7 water supply. Ready to move in immediately with clear registry documents.",
    listing_type: "sell",
    property_type: "house",
    price: 3800000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 2,
    carpet_area: 1100,
    city: "Orai",
    locality: "Sharda Nagar",
    address: "Sharda Nagar Gali 4, near Hospital Road, Orai",
    society: "Sharda Nagar Heights",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_1.jpg", "./images/property_3.jpg"],
    contact_name: "Kamla Devi",
    contact_phone: "+91 94155 33333",
    contact_email: "kamla@example.com",
    views_count: 125,
    status: "active",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-16",
    title: "Commercial Shop for Sale in Main Bazaar",
    description: "Superb commercial shop space located in the heart of Main Bazaar, Jalaun. Heavy footfall area, ideal for retail store, mobile shop, or dispensary. Immediate registry.",
    listing_type: "sell",
    property_type: "commercial",
    price: 2200000,
    bedrooms: 0,
    bathrooms: 1,
    balconies: 0,
    carpet_area: 400,
    city: "Jalaun",
    locality: "Main Bazaar",
    address: "Main Bazaar Chowk, near Devi Temple Road, Jalaun",
    society: "Main Market Commercial Complex",
    furnishing: "unfurnished",
    parking: "none",
    floor: 0,
    total_floors: 1,
    images: ["./images/property_4.jpg"],
    contact_name: "Rajesh Dwivedi",
    contact_phone: "+91 94520 12345",
    contact_email: "rajesh@example.com",
    views_count: 52,
    status: "active",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-17",
    title: "2 BHK Independent House for Rent on Station Road",
    description: "Well-ventilated 2 BHK independent house for rent in Kalpi near Station Road. Close to local schools and hospitals. Includes municipal water connection and dedicated bike parking.",
    listing_type: "rent",
    property_type: "house",
    price: 5500,
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1,
    carpet_area: 900,
    city: "Kalpi",
    locality: "Station Road",
    address: "Station Road, near Railway Gate, Kalpi",
    society: "Station Road Colony",
    furnishing: "semi-furnished",
    parking: "bike",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_1.jpg"],
    contact_name: "Anand Mishra",
    contact_phone: "+91 94151 67890",
    contact_email: "anand@example.com",
    views_count: 38,
    status: "active",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-18",
    title: "Residential Plot for Sale near Chandni Chauraha",
    description: "1200 Sq.Ft residential plot in a peaceful colony near Chandni Chauraha, Konch. Clear registry, direct owner listing. 25-feet road connectivity, ready for immediate house construction.",
    listing_type: "sell",
    property_type: "plot",
    price: 980000,
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    carpet_area: 1200,
    city: "Konch",
    locality: "Chandni Chauraha",
    address: "Lajpat Nagar Ext, near Chandni Chauraha, Konch",
    society: "Chandni Greens",
    furnishing: "unfurnished",
    parking: "none",
    floor: 0,
    total_floors: 0,
    images: ["./images/property_3.jpg"],
    contact_name: "Vinod Tiwari",
    contact_phone: "+91 99352 11223",
    contact_email: "vinod@example.com",
    views_count: 67,
    status: "active",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-19",
    title: "Premium 3 BHK Apartment for Sale in Civil Lines",
    description: "Luxurious 3 BHK flat in a gated society in Civil Lines, Jhansi. Modular kitchen, vitrified tiles, 24/7 security, power backup, and covered car parking. Near Jhansi Fort and elite schools.",
    listing_type: "sell",
    property_type: "apartment",
    price: 6200000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 3,
    carpet_area: 1650,
    city: "Jhansi",
    locality: "Civil Lines",
    address: "Civil Lines Rd, Elite Crossing Area, Jhansi",
    society: "Jhansi Towers",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 4,
    total_floors: 8,
    images: ["./images/property_2.jpg", "./images/property_1.jpg"],
    contact_name: "Vikram Singh",
    contact_phone: "+91 98390 44556",
    contact_email: "vikram@example.com",
    views_count: 140,
    status: "active",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-20",
    title: "Premium 3 BHK Flat for Sale in Gomti Nagar",
    description: "Fully-furnished luxury 3 BHK apartment in a premium high-rise society in Gomti Nagar, Lucknow. Walking distance from Kathauta Lake and local parks. Intercom, gym, swimming pool, and double basement parking.",
    listing_type: "sell",
    property_type: "apartment",
    price: 12000000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 3,
    carpet_area: 1800,
    city: "Lucknow",
    locality: "Gomti Nagar",
    address: "Sector 4, Gomti Nagar Extension, Lucknow",
    society: "Eldeco Greens",
    furnishing: "furnished",
    parking: "both",
    floor: 8,
    total_floors: 14,
    images: ["./images/property_2.jpg", "./images/property_3.jpg"],
    contact_name: "Amit Srivastava",
    contact_phone: "+91 98890 98765",
    contact_email: "amit@example.com",
    views_count: 210,
    status: "active",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-21",
    title: "Spacious 3 BHK Flat for Rent in Swaroop Nagar",
    description: "Semi-furnished 3 BHK flat available for rent in the upscale locality of Swaroop Nagar, Kanpur. Close to Moti Jheel and top medical facilities. 24 hours security and water supply.",
    listing_type: "rent",
    property_type: "apartment",
    price: 24000,
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    carpet_area: 1550,
    city: "Kanpur",
    locality: "Swaroop Nagar",
    address: "Swaroop Nagar, Near Moti Jheel, Kanpur",
    society: "Kanpur Residency",
    furnishing: "semi-furnished",
    parking: "car",
    floor: 2,
    total_floors: 5,
    images: ["./images/property_1.jpg"],
    contact_name: "Neeraj Saxena",
    contact_phone: "+91 93361 54321",
    contact_email: "neeraj@example.com",
    views_count: 105,
    status: "active",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-22",
    title: "Modern 2 BHK Apartment for Sale in Sector 62",
    description: "Sleek 2 BHK apartment in a gated township in Sector 62, Noida. Metro connectivity within 500m. 2 balconies, modular wardrobes, piped gas line, and club membership included.",
    listing_type: "sell",
    property_type: "apartment",
    price: 8500000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 2,
    carpet_area: 1150,
    city: "Noida",
    locality: "Sector 62",
    address: "Sector 62, Near Metro Station, Noida",
    society: "Stellar Park",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 5,
    total_floors: 12,
    images: ["./images/property_2.jpg", "./images/property_4.jpg"],
    contact_name: "Sanjay Mehta",
    contact_phone: "+91 98110 55443",
    contact_email: "sanjay@example.com",
    views_count: 175,
    status: "active",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-23",
    title: "3 BHK Builder Floor for Rent in Indirapuram",
    description: "Beautiful 3 BHK semi-furnished builder floor with independent terrace in Indirapuram, Ghaziabad. Modern wood fixtures, close to Shipra Mall and DPS Indirapuram. Gated security.",
    listing_type: "rent",
    property_type: "house",
    price: 18000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    carpet_area: 1400,
    city: "Ghaziabad",
    locality: "Indirapuram",
    address: "Vaishali Ext, near Shipra Mall, Ghaziabad",
    society: "Indirapuram Floors",
    furnishing: "semi-furnished",
    parking: "car",
    floor: 1,
    total_floors: 3,
    images: ["./images/property_1.jpg"],
    contact_name: "Ritu Sharma",
    contact_phone: "+91 98188 22334",
    contact_email: "ritu@example.com",
    views_count: 92,
    status: "active",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-24",
    title: "2 BHK Flat for Sale near Tajganj",
    description: "Lovely 2 BHK residential flat with Taj Mahal view from the balcony. Located in a prime tourist-safe zone in Tajganj, Agra. Semi-furnished, lifts, CCTV, and covered parking.",
    listing_type: "sell",
    property_type: "apartment",
    price: 4200000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    carpet_area: 1100,
    city: "Agra",
    locality: "Tajganj",
    address: "Fatehabad Road, near Taj View Crossing, Agra",
    society: "Taj Heights Colony",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 3,
    total_floors: 6,
    images: ["./images/property_2.jpg"],
    contact_name: "Hari Mohan",
    contact_phone: "+91 97600 44332",
    contact_email: "harimohan@example.com",
    views_count: 115,
    status: "active",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-25",
    title: "Traditional 2 BHK House for Rent near Assi Ghat",
    description: "Independent 2 BHK ground floor house for rent near Assi Ghat, Varanasi. Walking distance to the Ganga ghats. Ideal for spiritual seekers, researchers, or families. 24/7 water supply.",
    listing_type: "rent",
    property_type: "house",
    price: 12000,
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1,
    carpet_area: 1000,
    city: "Varanasi",
    locality: "Assi Ghat",
    address: "Assi Ghat Road, Bhelupur Crossing Area, Varanasi",
    society: "Ganga Kutir Home",
    furnishing: "semi-furnished",
    parking: "bike",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_1.jpg"],
    contact_name: "Shashi Kant Panday",
    contact_phone: "+91 94500 88990",
    contact_email: "shashikant@example.com",
    views_count: 148,
    status: "active",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-26",
    title: "Premium 3 BHK Villa for Sale in Civil Lines",
    description: "Spacious independent 3 BHK bungalow-style villa in Civil Lines, Prayagraj. High ceilings, large lawn, servant quarters, and direct road access. Located in a posh residential neighborhood.",
    listing_type: "sell",
    property_type: "house",
    price: 16500000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    carpet_area: 2800,
    city: "Prayagraj",
    locality: "Civil Lines",
    address: "Civil Lines, Near High Court, Prayagraj",
    society: "Kundan Nagar Bungalows",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 1,
    images: ["./images/property_3.jpg", "./images/property_1.jpg"],
    contact_name: "Rajeev Ranjan",
    contact_phone: "+91 94152 77889",
    contact_email: "rajeev@example.com",
    views_count: 165,
    status: "active",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-27",
    title: "2 BHK Residential Flat for Sale in Shastri Nagar",
    description: "Perfect 2 BHK family flat on Shastri Nagar Main Road, Meerut. Fully modular kitchen, tiles, balcony facing park, safe gated community. Close to shopping centers.",
    listing_type: "sell",
    property_type: "apartment",
    price: 3800000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    carpet_area: 1100,
    city: "Meerut",
    locality: "Shastri Nagar",
    address: "Shastri Nagar Sector 3, Meerut",
    society: "Shastri Enclave",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 2,
    total_floors: 4,
    images: ["./images/property_2.jpg"],
    contact_name: "Naveen Mittal",
    contact_phone: "+91 98970 12121",
    contact_email: "naveen@example.com",
    views_count: 73,
    status: "active",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-28",
    title: "3 BHK House for Sale in Rajendra Nagar",
    description: "Newly renovated 3 BHK independent house for sale in Rajendra Nagar, Bareilly. Marble flooring, woodwork in wardrobes, spacious kitchen. Clear title and direct owner transaction.",
    listing_type: "sell",
    property_type: "house",
    price: 5800000,
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    carpet_area: 1600,
    city: "Bareilly",
    locality: "Rajendra Nagar",
    address: "Rajendra Nagar Sector 2, near Suresh Sharma Nagar, Bareilly",
    society: "Rajendra Nagar Colony",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 0,
    total_floors: 2,
    images: ["./images/property_1.jpg", "./images/property_3.jpg"],
    contact_name: "Alok Johri",
    contact_phone: "+91 94125 55667",
    contact_email: "alok@example.com",
    views_count: 88,
    status: "active",
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-29",
    title: "3 BHK Luxury Apartment for Sale in Taramandal",
    description: "Splendid 3 BHK flat with modern amenities in Taramandal, Gorakhpur. View of Ramgarh Tal. Gated community with gym, kids play area, power backup, and round-the-clock security.",
    listing_type: "sell",
    property_type: "apartment",
    price: 7800000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    carpet_area: 1750,
    city: "Gorakhpur",
    locality: "Taramandal",
    address: "Taramandal Bypass Road, Near Ramgarh Tal, Gorakhpur",
    society: "Lakeview Apartments",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 6,
    total_floors: 10,
    images: ["./images/property_2.jpg", "./images/property_3.jpg"],
    contact_name: "Pawan Pandey",
    contact_phone: "+91 94510 22334",
    contact_email: "pawan@example.com",
    views_count: 145,
    status: "active",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-30",
    title: "2 BHK Apartment for Rent on Ramghat Road",
    description: "Fully functional 2 BHK apartment for rent in a safe society on Ramghat Road, Aligarh. Nearby schools, markets, and banks. Well-connected transport links.",
    listing_type: "rent",
    property_type: "apartment",
    price: 9000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    carpet_area: 1050,
    city: "Aligarh",
    locality: "Ramghat Road",
    address: "Ramghat Road, Near Centre Point, Aligarh",
    society: "Aligarh Heights",
    furnishing: "semi-furnished",
    parking: "car",
    floor: 3,
    total_floors: 6,
    images: ["./images/property_1.jpg"],
    contact_name: "Tariq Anwar",
    contact_phone: "+91 98972 33445",
    contact_email: "tariq@example.com",
    views_count: 55,
    status: "active",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-31",
    title: "3 BHK Builder Floor for Sale on Kanth Road",
    description: "Semi-furnished 3 BHK builder floor for sale in Moradabad's premium Kanth Road locality. Includes modern sanitary ware, chimneys, modular cabinets, and dedicated stilt parking.",
    listing_type: "sell",
    property_type: "house",
    price: 6800000,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    carpet_area: 1500,
    city: "Moradabad",
    locality: "Kanth Road",
    address: "Kanth Road, Near Ram Ganga Vihar, Moradabad",
    society: "Royal residency",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 1,
    total_floors: 3,
    images: ["./images/property_1.jpg", "./images/property_2.jpg"],
    contact_name: "Vineet Bisht",
    contact_phone: "+91 97590 66778",
    contact_email: "vineet@example.com",
    views_count: 90,
    status: "active",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-32",
    title: "Industrial/Commercial Plot for Sale on Delhi Road",
    description: "Prime 3600 Sq.Ft commercial/industrial land parcel on Delhi Road, Saharanpur. High-speed highway access, boundary wall done, clear title. Highly suitable for godown, showroom, or small factory.",
    listing_type: "sell",
    property_type: "plot",
    price: 4500000,
    bedrooms: 0,
    bathrooms: 0,
    balconies: 0,
    carpet_area: 3600,
    city: "Saharanpur",
    locality: "Delhi Road",
    address: "Delhi Road Industrial Area, Saharanpur",
    society: "Delhi Road Complex",
    furnishing: "unfurnished",
    parking: "none",
    floor: 0,
    total_floors: 0,
    images: ["./images/property_4.jpg"],
    contact_name: "Harpal Singh",
    contact_phone: "+91 98370 77889",
    contact_email: "harpal@example.com",
    views_count: 42,
    status: "active",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-33",
    title: "2 BHK Flat for Sale in Deokali",
    description: "Premium 2 BHK apartment in a newly constructed society in Deokali, Ayodhya. Very close to the national highway and 15 mins drive to Ram Janmabhoomi temple. High appreciation potential.",
    listing_type: "sell",
    property_type: "apartment",
    price: 5500000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 2,
    carpet_area: 1200,
    city: "Ayodhya",
    locality: "Deokali",
    address: "Deokali Chauraha, Ayodhya",
    society: "Ram Dwara Residency",
    furnishing: "semi-furnished",
    parking: "both",
    floor: 2,
    total_floors: 5,
    images: ["./images/property_2.jpg", "./images/property_3.jpg"],
    contact_name: "Satish Shukla",
    contact_phone: "+91 94530 55667",
    contact_email: "satish@example.com",
    views_count: 180,
    status: "active",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prop-34",
    title: "2 BHK Apartment for Rent in Krishna Nagar",
    description: "Nice 2 BHK apartment for rent in Krishna Nagar, Mathura. Semi-furnished with fans, geysers, modular cupboards. Located in a family-friendly safe neighborhood near local markets.",
    listing_type: "rent",
    property_type: "apartment",
    price: 11000,
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    carpet_area: 1150,
    city: "Mathura",
    locality: "Krishna Nagar",
    address: "Krishna Nagar, Vrindavan Road, Mathura",
    society: "Radhey Madhav Enclave",
    furnishing: "semi-furnished",
    parking: "car",
    floor: 1,
    total_floors: 4,
    images: ["./images/property_1.jpg", "./images/property_2.jpg"],
    contact_name: "Gopal Sharma",
    contact_phone: "+91 94127 12345",
    contact_email: "gopal@example.com",
    views_count: 65,
    status: "active",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

function initMockDatabase() {
  const existing = localStorage.getItem("platlo_properties");
  let needReset = false;
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed.length > 0 && (parsed[0].city !== "Orai" || parsed.length < MOCK_PROPERTIES_SEED.length)) {
        needReset = true; // reset to update mock database for Orai location focus and new seed count
      }
    } catch(e) {
      needReset = true;
    }
  }
  if (!existing || needReset) {
    localStorage.setItem("platlo_properties", JSON.stringify(MOCK_PROPERTIES_SEED));
  }
  if (!localStorage.getItem("platlo_enquiries")) {
    localStorage.setItem("platlo_enquiries", JSON.stringify([]));
  }
  if (!localStorage.getItem("platlo_saved")) {
    localStorage.setItem("platlo_saved", JSON.stringify([]));
  }
  
  // Restore mock user session if any
  const savedSession = localStorage.getItem("platlo_mock_session");
  if (savedSession) {
    window.PLATLO.currentUser = JSON.parse(savedSession);
  }
}

// Helper methods to read/write Mock DB
window.PLATLO_DB = {
  getProperties: () => {
    return JSON.parse(localStorage.getItem("platlo_properties") || "[]");
  },
  saveProperty: (prop) => {
    const props = window.PLATLO_DB.getProperties();
    props.unshift(prop);
    localStorage.setItem("platlo_properties", JSON.stringify(props));
    return prop;
  },
  updateProperty: (id, updatedFields) => {
    const props = window.PLATLO_DB.getProperties();
    const index = props.findIndex(p => p.id === id);
    if (index !== -1) {
      props[index] = { ...props[index], ...updatedFields, updated_at: new Date().toISOString() };
      localStorage.setItem("platlo_properties", JSON.stringify(props));
      return props[index];
    }
    return null;
  },
  deleteProperty: (id) => {
    let props = window.PLATLO_DB.getProperties();
    props = props.filter(p => p.id !== id);
    localStorage.setItem("platlo_properties", JSON.stringify(props));
    // Also remove any enquiries or saved records for this property
    let enquiries = window.PLATLO_DB.getEnquiries();
    enquiries = enquiries.filter(e => e.property_id !== id);
    localStorage.setItem("platlo_enquiries", JSON.stringify(enquiries));
    
    let saved = JSON.parse(localStorage.getItem("platlo_saved") || "[]");
    saved = saved.filter(s => s.property_id !== id);
    localStorage.setItem("platlo_saved", JSON.stringify(saved));
  },
  getEnquiries: () => {
    return JSON.parse(localStorage.getItem("platlo_enquiries") || "[]");
  },
  saveEnquiry: (enq) => {
    const enqs = window.PLATLO_DB.getEnquiries();
    enqs.unshift(enq);
    localStorage.setItem("platlo_enquiries", JSON.stringify(enqs));
    return enq;
  },
  getSavedProperties: () => {
    return JSON.parse(localStorage.getItem("platlo_saved") || "[]");
  },
  toggleSaveProperty: (userId, propId) => {
    let saved = window.PLATLO_DB.getSavedProperties();
    const index = saved.findIndex(s => s.user_id === userId && s.property_id === propId);
    let isSavedNow = false;
    if (index !== -1) {
      saved.splice(index, 1);
    } else {
      saved.push({ id: "saved-" + Math.random().toString(36).substr(2, 9), user_id: userId, property_id: propId, created_at: new Date().toISOString() });
      isSavedNow = true;
    }
    localStorage.setItem("platlo_saved", JSON.stringify(saved));
    return isSavedNow;
  },
  getReports: () => {
    return JSON.parse(localStorage.getItem("platlo_reports") || "[]");
  },
  saveReport: (report) => {
    const reports = window.PLATLO_DB.getReports();
    reports.unshift(report);
    localStorage.setItem("platlo_reports", JSON.stringify(reports));
    return report;
  },
  isSuspiciousBrokerPhone: (phone) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return false;
    
    // Check if phone number is in reports
    const reports = window.PLATLO_DB.getReports();
    const cleanReportedPhones = reports.map(r => (r.phone || "").replace(/\D/g, ""));
    const reportCount = cleanReportedPhones.filter(p => p === cleanPhone).length;
    if (reportCount >= 1) return true; // Flag even with 1 community report
    
    // Check if phone number has 3 or more properties listed in the system
    const properties = window.PLATLO_DB.getProperties();
    const matchingProps = properties.filter(p => p.contact_phone.replace(/\D/g, "") === cleanPhone);
    if (matchingProps.length >= 3) {
      return true;
    }
    
    // Check if listing multiple properties under different contact names
    if (matchingProps.length >= 2) {
      const distinctNames = new Set(matchingProps.map(p => p.contact_name.toLowerCase().trim()));
      if (distinctNames.size > 1) {
        return true;
      }
    }
    return false;
  }
};

// ==========================================================================
// LAYOUT & DOM RENDERING (HEADER / FOOTER / THEME)
// ==========================================================================
function renderHeader() {
  const container = document.getElementById("header-placeholder");
  if (!container) return;

  const currentPath = window.location.pathname;
  const isIndex = currentPath.endsWith("index.html") || currentPath.endsWith("/");
  const isSearch = currentPath.endsWith("properties.html");
  const isPost = currentPath.endsWith("post-property.html");
  const isDashboard = currentPath.endsWith("dashboard.html");

  container.className = "header";
  container.innerHTML = `
    <div class="container">
      <a href="./index.html" class="logo-container">
        <div class="logo-icon">P</div>
        <span class="logo-text">PLATLO</span>
      </a>
      
      <nav class="nav-links">
        <a href="./index.html" class="nav-link ${isIndex ? 'active' : ''}">Home</a>
        <a href="./properties.html" class="nav-link ${isSearch ? 'active' : ''}">Find Property</a>
        <a href="./post-property.html" class="nav-link ${isPost ? 'active' : ''}">Post Property</a>
        <a href="./dashboard.html" class="nav-link ${isDashboard ? 'active' : ''}">Dashboard</a>
      </nav>

      <div class="nav-actions">
        <button class="theme-toggle" id="theme-toggle-btn" title="Toggle Theme">
          <svg class="sun-icon" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
        <div id="auth-header-container" style="display: flex; gap: 12px; align-items: center;">
          <!-- Auth buttons injected here dynamically -->
        </div>
        <button class="hamburger-menu-btn" onclick="toggleMobileMenu()" aria-label="Toggle Navigation">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Mobile Drawer Menu -->
    <div class="mobile-drawer glass" id="mobile-drawer-menu" style="right: -300px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <a href="./index.html" class="logo-container">
          <div class="logo-icon">P</div>
          <span class="logo-text">PLATLO</span>
        </a>
        <button onclick="toggleMobileMenu()" style="background:none; border:none; font-size: 28px; color: var(--text-primary); cursor: pointer;">&times;</button>
      </div>
      <nav style="display: flex; flex-direction: column; gap: 24px; font-size: 18px; font-weight: 600;">
        <a href="./index.html" onclick="toggleMobileMenu()" style="color: ${isIndex ? 'var(--primary)' : 'inherit'};">Home</a>
        <a href="./properties.html" onclick="toggleMobileMenu()" style="color: ${isSearch ? 'var(--primary)' : 'inherit'};">Find Property</a>
        <a href="./post-property.html" onclick="toggleMobileMenu()" style="color: ${isPost ? 'var(--primary)' : 'inherit'};">Post Property</a>
        <a href="./dashboard.html" onclick="toggleMobileMenu()" style="color: ${isDashboard ? 'var(--primary)' : 'inherit'};">Dashboard</a>
      </nav>
    </div>
  `;

  // Initialize theme handler
  setupTheme();
}

function toggleMobileMenu() {
  const drawer = document.getElementById("mobile-drawer-menu");
  if (drawer) {
    drawer.classList.toggle("active");
  }
}
window.toggleMobileMenu = toggleMobileMenu;

function renderFooter() {
  const container = document.getElementById("footer-placeholder");
  if (!container) return;

  container.className = "footer";
  container.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo-container" style="margin-bottom: 20px;">
            <div class="logo-icon">P</div>
            <span class="logo-text">PLATLO</span>
          </div>
          <p>India's leading zero-brokerage property posting platform. We empower buyers, renters, and owners to deal directly with total transparency, modern calculators, and instant SEO-optimized listings.</p>
          <div class="social-links">
            <a href="#" class="social-link">f</a>
            <a href="#" class="social-link">t</a>
            <a href="#" class="social-link">in</a>
          </div>
        </div>
        <div>
          <h4 class="footer-links-title">For Buyers / Renters</h4>
          <ul class="footer-menu">
            <li><a href="./properties.html?type=rent" class="footer-menu-link">Browse Rent Properties</a></li>
            <li><a href="./properties.html?type=sell" class="footer-menu-link">Browse Sell Properties</a></li>
            <li><a href="./properties.html?locality=Patel%20Nagar" class="footer-menu-link">Properties in Patel Nagar</a></li>
            <li><a href="./properties.html?city=Orai" class="footer-menu-link">Browse Orai Properties</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-links-title">For Owners / Sellers</h4>
          <ul class="footer-menu">
            <li><a href="./post-property.html" class="footer-menu-link">Post a Listing Free</a></li>
            <li><a href="./dashboard.html" class="footer-menu-link">Manage Listings</a></li>
            <li><a href="./dashboard.html" class="footer-menu-link">View Leads / Enquiries</a></li>
            <li><a href="#" class="footer-menu-link">PropWorth Value Estimator</a></li>
          </ul>
        </div>
        <div class="footer-newsletter">
          <h4 class="footer-links-title">Stay Updated</h4>
          <p>Subscribe to our newsletter for latest pricing trends and hot deals in your city.</p>
          <form class="newsletter-form" onsubmit="event.preventDefault(); showToast('Subscribed successfully!');">
            <input type="email" placeholder="Your email address" required>
            <button class="btn btn-primary" type="submit">Subscribe</button>
          </form>
        </div>
      </div>
      <div class="footer-seo-directory" style="margin-top: 40px; padding-top: 30px; border-top: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px;">
        <div>
          <h5 style="font-size: 14px; margin-bottom: 15px; color: var(--text-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Buy Properties in UP</h5>
          <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; font-size: 13px;">
            <li><a href="./properties.html?city=Lucknow&type=sell" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Buy in Lucknow (Gomti Nagar)</a></li>
            <li><a href="./properties.html?city=Noida&type=sell" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Buy in Noida (Sector 62)</a></li>
            <li><a href="./properties.html?city=Agra&type=sell" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Buy in Agra (Tajganj)</a></li>
            <li><a href="./properties.html?city=Jhansi&type=sell" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Buy in Jhansi (Civil Lines)</a></li>
            <li><a href="./properties.html?city=Prayagraj&type=sell" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Buy in Prayagraj (Civil Lines)</a></li>
            <li><a href="./properties.html?city=Orai&type=sell" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Buy in Orai (Sushil Nagar)</a></li>
          </ul>
        </div>
        <div>
          <h5 style="font-size: 14px; margin-bottom: 15px; color: var(--text-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Rent Properties in UP</h5>
          <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; font-size: 13px;">
            <li><a href="./properties.html?city=Lucknow&type=rent" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Rent in Lucknow (Aliganj)</a></li>
            <li><a href="./properties.html?city=Noida&type=rent" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Rent in Noida (Sector 76)</a></li>
            <li><a href="./properties.html?city=Kanpur&type=rent" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Rent in Kanpur (Swaroop Nagar)</a></li>
            <li><a href="./properties.html?city=Varanasi&type=rent" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Rent in Varanasi (Assi Ghat)</a></li>
            <li><a href="./properties.html?city=Mathura&type=rent" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Rent in Mathura (Krishna Nagar)</a></li>
            <li><a href="./properties.html?city=Orai&type=rent" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Rent in Orai (Patel Nagar)</a></li>
          </ul>
        </div>
        <div>
          <h5 style="font-size: 14px; margin-bottom: 15px; color: var(--text-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Land & Commercial in UP</h5>
          <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; font-size: 13px;">
            <li><a href="./properties.html?city=Jalaun&prop_type=plot" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Plots for Sale in Jalaun</a></li>
            <li><a href="./properties.html?city=Kalpi&prop_type=plot" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Plots for Sale in Kalpi</a></li>
            <li><a href="./properties.html?city=Konch&prop_type=plot" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Plots for Sale in Konch</a></li>
            <li><a href="./properties.html?city=Saharanpur&prop_type=plot" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Plots for Sale in Saharanpur</a></li>
            <li><a href="./properties.html?city=Noida&prop_type=commercial" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Commercial Shops in Noida</a></li>
            <li><a href="./properties.html?city=Lucknow&prop_type=commercial" style="color: var(--text-muted); text-decoration: none; transition: color 0.2s;">Commercial Offices in Lucknow</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} PLATLO Platform. All rights reserved. Zero Brokerage direct connections.</p>
        <div style="display: flex; gap: 24px;">
          <a href="#" style="hover: color: var(--primary);">Privacy Policy</a>
          <a href="#" style="hover: color: var(--primary);">Terms of Service</a>
          <a href="#" style="hover: color: var(--primary);">Sitemap</a>
        </div>
      </div>
    </div>
  `;
}

// Theme Handling
function setupTheme() {
  const toggleBtn = document.getElementById("theme-toggle-btn");
  if (!toggleBtn) return;

  const sunIcon = toggleBtn.querySelector(".sun-icon");
  const moonIcon = toggleBtn.querySelector(".moon-icon");

  const setDarkTheme = (isDark) => {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
      localStorage.setItem("platlo_theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
      localStorage.setItem("platlo_theme", "light");
    }
  };

  // Check initial theme preference
  const savedTheme = localStorage.getItem("platlo_theme") || 
                     (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  
  setDarkTheme(savedTheme === "dark");

  toggleBtn.addEventListener("click", () => {
    const isCurrentlyDark = document.documentElement.getAttribute("data-theme") === "dark";
    setDarkTheme(!isCurrentlyDark);
  });
}

// Auth Header Navigation updates
function updateHeaderAuthUI() {
  const container = document.getElementById("auth-header-container");
  if (!container) return;

  if (window.PLATLO.currentUser) {
    container.innerHTML = `
      <a href="./dashboard.html" class="owner-info" style="cursor: pointer;">
        <div class="owner-avatar">${window.PLATLO.currentUser.name.charAt(0).toUpperCase()}</div>
        <span class="owner-name" style="display:none; @media(min-width:600px){display:inline};">${window.PLATLO.currentUser.name}</span>
      </a>
      <button class="btn btn-secondary btn-sm" onclick="logoutUser()">Logout</button>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openAuthModal()">Login / Signup</button>
      <a href="./post-property.html" class="btn btn-primary btn-sm">Post Property</a>
    `;
  }
}

// ==========================================================================
// TOAST ALERTS SYSTEM
// ==========================================================================
function showToast(message, type = "success") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.position = "fixed";
    toastContainer.style.bottom = "24px";
    toastContainer.style.right = "24px";
    toastContainer.style.zIndex = "3000";
    toastContainer.style.display = "flex";
    toastContainer.style.flexDirection = "column";
    toastContainer.style.gap = "10px";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.style.padding = "14px 24px";
  toast.style.borderRadius = "8px";
  toast.style.color = "white";
  toast.style.fontWeight = "600";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.15)";
  toast.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
  toast.style.transform = "translateY(20px)";
  toast.style.opacity = "0";
  
  if (type === "success") {
    toast.style.background = "linear-gradient(135deg, #0d9488, #10b981)";
  } else if (type === "error") {
    toast.style.background = "linear-gradient(135deg, #ef4444, #f43f5e)";
  } else {
    toast.style.background = "linear-gradient(135deg, #f59e0b, #d97706)";
  }

  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Trigger entering animation
  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 10);

  // Auto remove toast
  setTimeout(() => {
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==========================================================================
// AUTH DIALOG MODAL CONTROLS & AUTH LOGIC
// ==========================================================================
function injectAuthModal() {
  if (document.getElementById("auth-modal-overlay")) return;

  const modal = document.createElement("div");
  modal.id = "auth-modal-overlay";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 420px; padding: 30px;">
      <button class="modal-close" onclick="closeAuthModal()">&times;</button>
      
      <div style="text-align: center; margin-bottom: 24px;">
        <div class="logo-icon" style="margin: 0 auto 12px; width: 48px; height: 48px; font-size: 24px;">P</div>
        <h3 style="font-size: 22px;">Welcome to PLATLO</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Zero Brokerage. Direct Connectivity.</p>
      </div>

      <!-- Tab Selectors -->
      <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 20px;">
        <button id="tab-login" class="tab-btn active" style="flex: 1; text-align: center; padding: 10px;" onclick="switchAuthTab('login')">Login</button>
        <button id="tab-signup" class="tab-btn" style="flex: 1; text-align: center; padding: 10px;" onclick="switchAuthTab('signup')">Sign Up</button>
      </div>

      <!-- Form for Login/Signup -->
      <form id="auth-modal-form" onsubmit="handleAuthSubmit(event)">
        <div class="form-group" id="grp-name" style="display: none;">
          <label for="auth-name">Full Name</label>
          <input type="text" class="form-control" id="auth-name" placeholder="John Doe">
        </div>
        <div class="form-group">
          <label for="auth-email">Email Address</label>
          <input type="email" class="form-control" id="auth-email" placeholder="john@example.com" required>
        </div>
        <div class="form-group" id="grp-phone">
          <label for="auth-phone">Phone Number (Optional)</label>
          <input type="text" class="form-control" id="auth-phone" placeholder="+91 XXXXX XXXXX">
        </div>
        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" class="form-control" id="auth-password" placeholder="••••••••" required>
        </div>
        
        <button type="submit" class="btn btn-primary" id="auth-submit-btn" style="width: 100%; padding: 14px; margin-top: 10px;">Proceed</button>
      </form>

      <!-- Simulated OTP (displays after sign up for simplicity in mock) -->
      <div id="otp-container" style="display: none; text-align: center;">
        <h4 style="margin-bottom: 12px;">Verify Mobile / Email</h4>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">We've sent a 4-digit code to your email.</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
          <input type="text" maxlength="1" class="form-control otp-digit" style="width: 48px; height: 48px; text-align: center; font-size: 20px; font-weight: 700;" required>
          <input type="text" maxlength="1" class="form-control otp-digit" style="width: 48px; height: 48px; text-align: center; font-size: 20px; font-weight: 700;" required>
          <input type="text" maxlength="1" class="form-control otp-digit" style="width: 48px; height: 48px; text-align: center; font-size: 20px; font-weight: 700;" required>
          <input type="text" maxlength="1" class="form-control otp-digit" style="width: 48px; height: 48px; text-align: center; font-size: 20px; font-weight: 700;" required>
        </div>
        <button class="btn btn-primary" onclick="verifyOtp()" style="width: 100%; padding: 14px;">Verify & Login</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Setup OTP inputs auto-focus behavior
  const digits = document.querySelectorAll(".otp-digit");
  digits.forEach((el, index) => {
    el.addEventListener("keyup", (e) => {
      if (el.value.length === 1 && index < 3) {
        digits[index + 1].focus();
      }
      if (e.key === "Backspace" && index > 0) {
        digits[index - 1].focus();
      }
    });
  });
}

function openAuthModal() {
  injectAuthModal();
  switchAuthTab('login');
  document.getElementById("auth-modal-overlay").classList.add("active");
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal-overlay");
  if (modal) modal.classList.remove("active");
}

let activeAuthTab = "login";
function switchAuthTab(tab) {
  activeAuthTab = tab;
  const grpName = document.getElementById("grp-name");
  const grpPhone = document.getElementById("grp-phone");
  const form = document.getElementById("auth-modal-form");
  const otp = document.getElementById("otp-container");
  const submitBtn = document.getElementById("auth-submit-btn");

  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");

  form.style.display = "block";
  otp.style.display = "none";

  if (tab === "login") {
    grpName.style.display = "none";
    grpPhone.style.display = "none";
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    submitBtn.textContent = "Login";
  } else {
    grpName.style.display = "flex";
    grpPhone.style.display = "flex";
    tabLogin.classList.remove("active");
    tabSignup.classList.add("active");
    submitBtn.textContent = "Create Account";
  }
}

// Auth submission routing
async function handleAuthSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("auth-name").value;
  const email = document.getElementById("auth-email").value;
  const phone = document.getElementById("auth-phone").value;
  const password = document.getElementById("auth-password").value;

  if (window.PLATLO.isMock) {
    if (activeAuthTab === "signup") {
      // Show OTP confirmation screen in mock mode
      document.getElementById("auth-modal-form").style.display = "none";
      document.getElementById("otp-container").style.display = "block";
      // Store temporary signup user info
      window._tempSignup = { name, email, phone };
      showToast("OTP code 1234 sent to " + email);
    } else {
      // Simple login check
      if (password.length >= 6) {
        const user = { id: "mock-user", email, name: email.split("@")[0], phone: "" };
        window.PLATLO.currentUser = user;
        localStorage.setItem("platlo_mock_session", JSON.stringify(user));
        showToast("Logged in successfully!");
        closeAuthModal();
        updateHeaderAuthUI();
        document.dispatchEvent(new CustomEvent("platloAuthChange"));
      } else {
        showToast("Password must be at least 6 characters.", "error");
      }
    }
  } else {
    // Supabase Authenticated Actions
    if (activeAuthTab === "signup") {
      const { data, error } = await window.PLATLO.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, phone }
        }
      });
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Registration successful! Please check your email for confirmation.", "success");
        closeAuthModal();
      }
    } else {
      const { data, error } = await window.PLATLO.supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Welcome back!", "success");
        closeAuthModal();
      }
    }
  }
}

function verifyOtp() {
  const digits = document.querySelectorAll(".otp-digit");
  let enteredCode = "";
  digits.forEach(d => enteredCode += d.value);

  if (enteredCode === "1234") {
    const temp = window._tempSignup || { name: "New User", email: "user@platlo.com", phone: "" };
    const user = { id: "mock-user-" + Math.random().toString(36).substr(2, 9), email: temp.email, name: temp.name, phone: temp.phone };
    window.PLATLO.currentUser = user;
    localStorage.setItem("platlo_mock_session", JSON.stringify(user));
    showToast("Verification successful! Registered.");
    closeAuthModal();
    updateHeaderAuthUI();
    document.dispatchEvent(new CustomEvent("platloAuthChange"));
  } else {
    showToast("Invalid code. Use 1234.", "error");
  }
}

function logoutUser() {
  if (window.PLATLO.isMock) {
    window.PLATLO.currentUser = null;
    localStorage.removeItem("platlo_mock_session");
    showToast("Logged out successfully.");
    updateHeaderAuthUI();
    document.dispatchEvent(new CustomEvent("platloAuthChange"));
  } else {
    window.PLATLO.supabase.auth.signOut().then(() => {
      showToast("Logged out successfully.");
      window.PLATLO.currentUser = null;
      updateHeaderAuthUI();
      document.dispatchEvent(new CustomEvent("platloAuthChange"));
    });
  }
}

// ==========================================================================
// AI CHATBOT COPILOT IMPLEMENTATION
// ==========================================================================
const botStyle = `
  .ai-bot-btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
    cursor: pointer;
    z-index: 2000;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
  }
  .ai-bot-btn:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 15px 30px rgba(99, 102, 241, 0.6);
  }
  .ai-bot-panel {
    position: fixed;
    bottom: 105px;
    right: 30px;
    width: 360px;
    height: 500px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: translateY(20px) scale(0.95);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ai-bot-panel.active {
    transform: translateY(0) scale(1);
    opacity: 1;
    pointer-events: all;
  }
  .ai-bot-header {
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
    border-bottom: 1px solid var(--border-color);
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .ai-bot-messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background-color: var(--bg-secondary);
  }
  .ai-msg {
    max-width: 80%;
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 13.5px;
    line-height: 1.5;
  }
  .ai-msg.bot {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    align-self: flex-start;
    border-bottom-left-radius: 2px;
    border: 1px solid var(--border-color);
  }
  .ai-msg.user {
    background: var(--primary);
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 2px;
  }
  .ai-bot-input-area {
    padding: 12px 16px;
    border-top: 1px solid var(--border-color);
    background-color: var(--bg-tertiary);
    display: flex;
    gap: 10px;
  }
  .ai-bot-input {
    flex: 1;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    font-size: 13px;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }
  .ai-bot-suggests {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 10px 20px;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
  }
  .ai-suggest-btn {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-secondary);
    transition: var(--transition-fast);
  }
  .ai-suggest-btn:hover {
    color: var(--primary);
    border-color: var(--primary);
    background-color: var(--bg-secondary);
  }
`;

function initAIChatbot() {
  if (document.getElementById("ai-chatbot-container")) return;

  const styleEl = document.createElement("style");
  styleEl.textContent = botStyle;
  document.head.appendChild(styleEl);

  const chatbotWrapper = document.createElement("div");
  chatbotWrapper.id = "ai-chatbot-container";
  chatbotWrapper.innerHTML = `
    <!-- Floating Button -->
    <button class="ai-bot-btn" id="ai-chatbot-btn" title="PLATLO AI Assistant">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
    </button>
    
    <!-- Chat Panel -->
    <div class="ai-bot-panel glass" id="ai-chatbot-panel">
      <!-- Header -->
      <div class="ai-bot-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:10px; height:10px; border-radius:50%; background-color:#10b981; box-shadow:0 0 8px #10b981;"></div>
          <strong style="font-size:15px; color:var(--text-primary);">PLATLO AI Copilot</strong>
        </div>
        <button style="background:none; border:none; font-size:20px; color:var(--text-muted); cursor:pointer;" onclick="toggleAIChat()">✕</button>
      </div>

      <!-- Messages Box -->
      <div class="ai-bot-messages" id="ai-bot-msgs">
        <div class="ai-msg bot">
          Hello! I am your PLATLO AI Assistant. Ask me to find houses/plots, calculate EMI, or draft agreements in any major city of Uttar Pradesh!
        </div>
      </div>

      <!-- Quick replies -->
      <div class="ai-bot-suggests">
        <button class="ai-suggest-btn" onclick="sendAISuggestion('Show me rentals in Lucknow')">🏠 Lucknow Rent</button>
        <button class="ai-suggest-btn" onclick="sendAISuggestion('Show me Noida apartments')">🏢 Noida Flats</button>
        <button class="ai-suggest-btn" onclick="sendAISuggestion('Calculate stamp duty for 50 Lakhs')">💰 Stamp Duty Math</button>
      </div>

      <!-- Input Form -->
      <form class="ai-bot-input-area" onsubmit="handleAIChatSubmit(event)">
        <input type="text" id="ai-chat-input" class="ai-bot-input" placeholder="Ask AI... (e.g. 2 BHK in Noida under 40k)" autocomplete="off">
        <button class="btn btn-primary" type="submit" style="padding: 8px 16px; font-size:12px;">Send</button>
      </form>
    </div>
  `;
  document.body.appendChild(chatbotWrapper);

  const btn = document.getElementById("ai-chatbot-btn");
  if (btn) btn.addEventListener("click", toggleAIChat);
}

function toggleAIChat() {
  const panel = document.getElementById("ai-chatbot-panel");
  if (panel) {
    panel.classList.toggle("active");
  }
}

function sendAISuggestion(text) {
  const input = document.getElementById("ai-chat-input");
  if (input) {
    input.value = text;
    handleAIChatSubmit(new Event('submit'));
  }
}

function handleAIChatSubmit(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("ai-chat-input");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  appendAIChatMessage(text, "user");
  input.value = "";

  setTimeout(() => {
    const reply = generateAIResponse(text);
    appendAIChatMessage(reply, "bot");
  }, 600);
}

function appendAIChatMessage(text, sender) {
  const box = document.getElementById("ai-bot-msgs");
  if (!box) return;

  const msg = document.createElement("div");
  msg.className = `ai-msg ${sender}`;
  msg.innerHTML = text;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
}

function generateAIResponse(query) {
  const q = query.toLowerCase();
  
  if (q.includes("stamp duty") || q.includes("registry") || q.includes("acquisition cost")) {
    const numMatch = q.match(/\d+/g);
    if (numMatch) {
      const price = parseFloat(numMatch[0]) * (q.includes("lakh") || q.includes("lac") ? 100000 : (q.includes("crore") || q.includes("cr") ? 10000000 : 1));
      const stamp = Math.round(price * 0.055);
      const reg = Math.round(price * 0.01);
      return `For a property value of ₹${price.toLocaleString('en-IN')}:<br>
              • Estimated Stamp Duty (5.5%): <strong>₹${stamp.toLocaleString('en-IN')}</strong><br>
              • Registration Charges (1%): <strong>₹${reg.toLocaleString('en-IN')}</strong><br>
              • Total government fees: <strong>₹${(stamp + reg).toLocaleString('en-IN')}</strong>.`;
    }
    return "To calculate Stamp Duty, please include a value. E.g., 'Calculate stamp duty for 30 Lakhs'.";
  }

  if (q.includes("agreement") || q.includes("contract") || q.includes("rent deed")) {
    return "You can draft and print a standard 11-month Rental Agreement instantly inside your <a href='./dashboard.html'>User Dashboard</a> under the 'Rental Agreement Draft' tab. It is 100% free and legal.";
  }

  if (q.includes("rent") || q.includes("sell") || q.includes("plot") || q.includes("house") || q.includes("bhk") || q.includes("shop") || q.includes("apartment") || q.includes("commercial")) {
    const properties = window.PLATLO_DB.getProperties();
    
    // Parse city
    const citiesList = ["lucknow", "kanpur", "noida", "ghaziabad", "agra", "varanasi", "prayagraj", "meerut", "bareilly", "gorakhpur", "aligarh", "moradabad", "saharanpur", "ayodhya", "mathura", "orai", "jalaun", "kalpi", "konch", "jhansi"];
    const matchedCity = citiesList.find(c => q.includes(c));
    
    // Parse known localities in the query
    const knownLocalities = [...new Set(properties.map(p => p.locality.toLowerCase()))];
    const queryLocalities = knownLocalities.filter(loc => q.includes(loc));

    let matches = properties.filter(p => {
      // Filter by city if specified
      if (matchedCity && p.city.toLowerCase() !== matchedCity) return false;
      
      // Filter by locality if specified
      if (queryLocalities.length > 0 && !queryLocalities.includes(p.locality.toLowerCase())) return false;
      
      // Filter by listing type
      if (q.includes("rent") && p.listing_type !== "rent") return false;
      if ((q.includes("sell") || q.includes("buy") || q.includes("sale")) && p.listing_type !== "sell") return false;
      
      // Filter by BHK
      if (q.includes("1 bhk") && p.bedrooms !== 1) return false;
      if (q.includes("2 bhk") && p.bedrooms !== 2) return false;
      if (q.includes("3 bhk") && p.bedrooms !== 3) return false;
      
      // Filter by property type
      if (q.includes("plot") && p.property_type !== "plot") return false;
      if (q.includes("apartment") && p.property_type !== "apartment") return false;
      if (q.includes("house") && p.property_type !== "house") return false;
      if ((q.includes("commercial") || q.includes("shop") || q.includes("office")) && p.property_type !== "commercial") return false;

      // Filter by budget
      const numMatch = q.match(/\d+/g);
      if (numMatch) {
        const budget = parseFloat(numMatch[0]) * (q.includes("lakh") || q.includes("lac") ? 100000 : (q.includes("crore") || q.includes("cr") ? 10000000 : (q.includes("k") || q.includes("thousand") ? 1000 : 1)));
        if (p.price > budget && budget > 1000) return false;
      }

      return true;
    });

    if (matches.length > 0) {
      const links = matches.slice(0, 5).map(p => `• <a href='./property.html?id=${p.id}'>${p.title}</a> (₹${p.price.toLocaleString('en-IN')}${p.listing_type==='rent'?'/mo':''})`).join("<br>");
      return `I found these matching properties for you:<br>${links}${matches.length > 5 ? '<br>• <i>and more... Try refining your query!</i>' : ''}`;
    } else {
      const cityFeedback = matchedCity ? ` in ${matchedCity.charAt(0).toUpperCase() + matchedCity.slice(1)}` : " in Uttar Pradesh";
      return `I couldn't find any direct matches${cityFeedback} for those specific keywords. Try a broader search like 'Show me Lucknow rentals' or 'Plots for sale in Noida'.`;
    }
  }

  return "I can help you look up listings, calculate stamp duty, and answer questions. Try asking: 'Show Lucknow rent houses' or 'stamp duty for 50 Lakhs'.";
}

// Global Exports
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleAuthSubmit = handleAuthSubmit;
window.verifyOtp = verifyOtp;
window.logoutUser = logoutUser;
window.showToast = showToast;
window.toggleAIChat = toggleAIChat;
window.sendAISuggestion = sendAISuggestion;
window.handleAIChatSubmit = handleAIChatSubmit;

function initHomepageFAQs() {
  const faqBox = document.getElementById("homepage-faq-box");
  if (!faqBox) return;

  const faqs = [
    {
      q: "What makes PLATLO different from typical real estate portals like 99acres or Magicbricks?",
      a: "Unlike traditional platforms, PLATLO is a 100% Zero-Brokerage direct peer-to-peer portal. We enforce strict owner-only posting policies so that buyers, renters, and owners can transact directly with complete transparency, without middleman commissions or broker fees."
    },
    {
      q: "How does the direct scheduling and Site-Pass Ticket system work?",
      a: "Sellers and landlords list their available dates and slots. Buyers or renters select their visit type (physical site tour or live video call) and reserve a slot. This instantly registers the visit in the landlord's dashboard and generates a barcoded, printable Site-Pass ticket."
    },
    {
      q: "Can I draft a legally compliant rental agreement directly on PLATLO?",
      a: "Yes! The platform includes a 1-click Rental Agreement draft creator. Landlords and tenants can fill in coordinates, monthly rent, deposits, and terms to instantly generate a professionally formatted, tax-compliant 11-month contract draft ready for printing."
    },
    {
      q: "How does the PropWorth Index evaluate listing valuations?",
      a: "The PropWorth Index compares a property's per-square-foot valuation against regional Uttar Pradesh urban baseline indexes. It classifies listings as Great Deal (green), Fair Price (indigo), or Premium (amber) to keep transactions fair and transparent."
    }
  ];

  faqBox.innerHTML = faqs.map((faq, idx) => `
    <div class="faq-item" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary); overflow: hidden; margin-bottom: 12px; transition: all 0.3s ease;">
      <button onclick="toggleFAQ(${idx})" style="width: 100%; border: none; background: none; padding: 18px; text-align: left; font-weight: 700; color: var(--text-primary); font-size: 14.5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
        <span>${faq.q}</span>
        <span id="faq-icon-${idx}" style="font-size: 20px; color: var(--primary); transition: transform 0.2s;">+</span>
      </button>
      <div id="faq-answer-${idx}" style="max-height: 0; overflow: hidden; transition: all 0.3s ease-out; border-top: 0 solid var(--border-color); color: var(--text-secondary); font-size: 13.5px; line-height: 1.6; padding: 0 18px;">
        <p style="margin-bottom: 18px; margin-top: 0;">${faq.a}</p>
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
        answer.style.padding = "0 18px";
        answer.style.borderTopWidth = "0px";
        icon.textContent = "+";
        icon.style.transform = "rotate(0deg)";
      } else {
        document.querySelectorAll("[id^='faq-answer-']").forEach((el, i) => {
          el.style.maxHeight = "0px";
          el.style.padding = "0 18px";
          el.style.borderTopWidth = "0px";
          const iconEl = document.getElementById(`faq-icon-${i}`);
          if (iconEl) {
            iconEl.textContent = "+";
            iconEl.style.transform = "rotate(0deg)";
          }
        });
        answer.style.maxHeight = "150px";
        answer.style.padding = "18px";
        answer.style.borderTopWidth = "1px";
        icon.textContent = "−";
        icon.style.transform = "rotate(180deg)";
      }
    };
  }

  // Inject homepage FAQPage Schema
  const homepageSchema = {
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

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.text = JSON.stringify(homepageSchema);
  document.head.appendChild(script);
}

// Connection Status Checker
function updateConnectionStatus() {
  const isOnline = navigator.onLine;
  let banner = document.getElementById("offline-mode-banner");
  
  if (!isOnline) {
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "offline-mode-banner";
      banner.className = "offline-banner active";
      banner.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; gap:8px; width:100%; padding: 10px; font-weight:700; font-size:13px;">
          <span>📡 Working in Offline Mode (Cached Data)</span>
        </div>
      `;
      document.body.insertBefore(banner, document.body.firstChild);
    } else {
      banner.classList.add("active");
    }
  } else {
    if (banner) {
      banner.classList.remove("active");
      setTimeout(() => {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
      }, 400);
    }
  }
}

// PWA Install Banner Logic
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  let banner = document.getElementById("pwa-install-banner");
  if (banner) return;
  
  banner = document.createElement("div");
  banner.id = "pwa-install-banner";
  banner.className = "pwa-banner active";
  banner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; max-width:1200px; margin:0 auto; padding:12px 20px; gap:16px;">
      <span style="font-size:13.5px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
        📱 Install PLATLO app for a faster, offline direct-owner experience!
      </span>
      <div style="display:flex; gap:10px; align-items:center;">
        <button class="btn btn-primary btn-sm" onclick="triggerPWAInstall()" style="font-size:12px; padding:6px 14px; font-weight:700;">Install</button>
        <button onclick="dismissPWAInstall()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:18px; padding:4px; font-weight:bold; line-height:1;">&times;</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
}

function triggerPWAInstall() {
  const banner = document.getElementById("pwa-install-banner");
  if (banner) {
    banner.classList.remove("active");
    setTimeout(() => banner.remove(), 400);
  }
  
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] User accepted install prompt");
      }
      deferredPrompt = null;
    });
  }
}

function dismissPWAInstall() {
  const banner = document.getElementById("pwa-install-banner");
  if (banner) {
    banner.classList.remove("active");
    setTimeout(() => banner.remove(), 400);
  }
}

window.triggerPWAInstall = triggerPWAInstall;
window.dismissPWAInstall = dismissPWAInstall;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initDatabase();
  renderHeader();
  renderFooter();
  updateHeaderAuthUI();
  initAIChatbot();
  if (document.getElementById("homepage-faq-box")) {
    initHomepageFAQs();
  }

  // Register PWA Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then((reg) => console.log("[PWA] Service Worker registered successfully:", reg.scope))
      .catch((err) => console.log("[PWA] Service Worker registration failed:", err));
  }

  // Connection State listeners
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  updateConnectionStatus();
});
