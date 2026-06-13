import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Setup JSON parsing with limit to allow base64 uploaded product images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Database directory & files
const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data folder and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
try {
  fs.chmodSync(DATA_DIR, 0o777);
} catch (e) {
  console.warn('Could not chmod DATA_DIR:', e);
}

// Initial 6 premium "Readersonic" products as seed data
const SEEDED_PRODUCTS = [
  {
    id: 'prod_1',
    name: 'Readersonic Whisper Book',
    description: "The world's first e-reader with synchronized active noise mask and integrated spatial audiobook reader.",
    longDescription: 'Engineered for extreme reading environments. The Readersonic Whisper Book combines an eye-safe, glare-free 300-PPI electronic ink display with dual micro-vibe bone conduction drivers integrated directly into the chassis. Feel the soundscapes of your favorite novels synchronized with the words you read. Ambient, slow-cadence instrumental tracks are generated dynamically based on the literary mood of each chapter.',
    price: 249.99,
    rating: 4.9,
    reviewsCount: 124,
    images: [
      'https://picsum.photos/seed/ereader1/600/600',
      'https://picsum.photos/seed/ereader1_detail/600/600'
    ],
    features: [
      '300 PPI glare-free paperwhite display',
      'Dual micro-vibe bone conduction channels',
      'Dynamic literary mood-soundtracks',
      'IPX8 waterproof for bath readings',
      '60-day ultra-long standby battery life'
    ],
    specs: {
      'Screen Size': '7.2 inches high-contrast e-Ink',
      'Audio Sync': 'Bluetooth 5.3 + Direct Bone Conduction',
      'Storage Capacity': '64 GB (Stores ~50,000 eBooks)',
      'Water Resistance': 'IPX8 (up to 2m deep for 60 min)',
      'Charging Interface': 'USB Type-C Fast Charging (12W)'
    },
    colors: [
      { name: 'Lunar Charcoal', hex: '#2A2D34' },
      { name: 'Polar Silver', hex: '#EAEAEA' }
    ],
    stock: 15,
    popular: true
  },
  {
    id: 'prod_2',
    name: 'Acoustic Oasis Headgear',
    description: 'Ultra-plush reference headphones meticulously tuned specifically for narrator vocals and ambient focus tracks.',
    longDescription: 'Designed inside audio sanctuaries, these luxury open-back headphones isolate narrator vocals, giving audiobooks a physical presence. The Acoustic Oasis Headgear incorporates multi-layered diaphragms that separate mid-range consonants from background sweeps, making dialogue crystal clear at low volumes while guarding your ears from auditory fatigue during marathon 8-hour reading sessions.',
    price: 189.50,
    rating: 4.8,
    reviewsCount: 92,
    images: [
      'https://picsum.photos/seed/headphones1/600/600',
      'https://picsum.photos/seed/headphones1_detail/600/600'
    ],
    features: [
      'Mid-range dialog separation engines',
      'Zero-pressure pressure memory foam cups',
      'Open-back spatial depth replication',
      'Passive ambient bypass for safety',
      'Includes premium wool braided travel pouch'
    ],
    specs: {
      'Transducer Type': '45mm dynamic neodymium',
      'Frequency Response': '8 Hz - 28,000 Hz',
      'Connector': '3.5mm Gold-Plated (High impedance & wireless option)',
      'Battery (Wireless Mode)': '40 hours active ANC playback',
      'Weight': '248 grams'
    },
    colors: [
      { name: 'Obsidian Blue', hex: '#1C2E3D' },
      { name: 'Sandstone Gold', hex: '#E2D4C9' }
    ],
    stock: 22,
    popular: true
  },
  {
    id: 'prod_3',
    name: 'Vibe Frame Reading Glasses',
    description: 'Smart reading frames featuring open-ear spatial audio engines and fatigue-reducing lenses.',
    longDescription: 'Crafted for modern digital and paper book readers. The Vibe Frame Reading Glasses feature custom blue-light filtering lenses coupled with ultra-miniaturized focus transmitters that direct high-definition audio straight to your auditory canal without obstructing outer ears. Read paperbacks while enjoying soft acoustic layers that follow your page updates.',
    price: 159.00,
    rating: 4.6,
    reviewsCount: 54,
    images: [
      'https://picsum.photos/seed/glasses1/600/600',
      'https://picsum.photos/seed/glasses1_detail/600/600'
    ],
    features: [
      'Advanced blue-shield lens coating',
      'Open-ear micro-dynamic audio transmitters',
      'Lightweight eco-acetate construction',
      'Touch-swipe controls on the temples',
      'Prescription-friendly swappable core'
    ],
    specs: {
      'Lens Coating': '99.4% Blue-light block, UV400',
      'Audio Drive': 'Twin 12mm directional sound portals',
      'Sensors': 'Capacitive touch gesture temple rails',
      'Weight': '38 grams ultra-light frame',
      'Battery Rating': '12 hours reading audio per charge'
    },
    colors: [
      { name: 'Tortoise Matte', hex: '#583D28' },
      { name: 'Minimalist Frost', hex: '#D2DAE2' }
    ],
    stock: 8,
    popular: false
  },
  {
    id: 'prod_4',
    name: 'Sonic Bookmark Speaker',
    description: 'A pocket-sized spatial speaker that docks on books and floods rooms with ambient soundscapes.',
    longDescription: 'The smallest heavy-duty ambient device in our collection. The Sonic Bookmark Speaker can clip onto any physical paperback or tablet to cast a rich, spherical sound sphere tailored for sound-isolated reading. Includes built-in microphones to balance ambient noise levels on the fly, dynamically lowering the speaker output when quiet is detected in your immediate vicinity.',
    price: 79.99,
    rating: 4.7,
    reviewsCount: 147,
    images: [
      'https://picsum.photos/seed/speaker1/600/600',
      'https://picsum.photos/seed/speaker1_detail/600/600'
    ],
    features: [
      'Physical page-clipping tension mount',
      '360-degree spatial acoustic beamforming',
      'Ambient noise auto-sensory damping',
      'Custom woven tactile fabric shell',
      'Integrated bookmark strap'
    ],
    specs: {
      'Amplifier power': '8W Peak Class-D digital amp',
      'Mount system': 'Flexi-silicone spring clamp',
      'Wireless Type': 'Ultra-wideband low-latency audio',
      'Size': '120 x 42 x 15 mm',
      'Battery Life': '18 hours continuous operation'
    },
    colors: [
      { name: 'Forest Sage', hex: '#4A5D4E' },
      { name: 'Lunar Charcoal', hex: '#2A2D34' }
    ],
    stock: 45,
    popular: false
  },
  {
    id: 'prod_5',
    name: 'Readersonic Pro Aura Book',
    description: 'An expansive 10-inch note-taking e-reader featuring studio-grade bone conduction resonance mechanics.',
    longDescription: 'The ultimate professional reading and note-taking tablet. The Readersonic Pro Aura Book is built with a magnificent 10.3-inch glass e-Ink display featuring paperlike friction coating and low friction pen inputs. The frame itself relies on a sound-resonance matrix, transforming the entire back surface of the tablet into a massive diaphragm that delivers crisp, warm audio frequencies directly into your fingers and palms.',
    price: 429.00,
    rating: 5.0,
    reviewsCount: 38,
    images: [
      'https://picsum.photos/seed/ereader2/600/600',
      'https://picsum.photos/seed/ereader2_detail/600/600'
    ],
    features: [
      '10.3-inch responsive note-taking glass canvas',
      'Vibe-palm audio resonance technology',
      'Includes active stylus pen (never needs charging)',
      'Live-to-voice transcription on margin notepad',
      'Advanced document PDF annotation tools'
    ],
    specs: {
      'Screen Size': '10.3-inch flexible electronic ink',
      'Resonator Type': 'Acoustic actuator matrix',
      'Storage Capacity': '128 GB (with microSD expansion up to 512GB)',
      'Stylus technology': 'Wacom electromagnetic resonance',
      'Operating System': 'Security-hardened SonicOS (Android based)'
    },
    colors: [
      { name: 'Sovereign Bronze', hex: '#4E453F' },
      { name: 'Polar Silver', hex: '#EAEAEA' }
    ],
    stock: 6,
    popular: true
  },
  {
    id: 'prod_6',
    name: 'Studio Vocal Shield Pods',
    description: "The world's finest in-ear buds designed to neutralize harsh sound transients from digital audioreaders.",
    longDescription: 'A triumph of acoustic compression. Standard in-ear buds suffer from sharp high-frequency sound distortion (sibilance) when scaling audiobooks or speech streams. These Buds are equipped with physical sound filters and adaptive digital signal processing (DSP) to sculpt speech transients, preserving the lushness of human voices in high fidelity.',
    price: 125.00,
    rating: 4.5,
    reviewsCount: 81,
    images: [
      'https://picsum.photos/seed/earbuds1/600/600',
      'https://picsum.photos/seed/earbuds1_detail/600/600'
    ],
    features: [
      'Sibilance vocal shaping algorithms',
      'High-grade copper acoustic pathways',
      'Ultra-snug hypoallergenic seal buds',
      'Fast charger pocket-vault container',
      'Sweat-proof casing'
    ],
    specs: {
      'Frequency range': '10 Hz - 22,000 Hz',
      'ANC Rating': 'Up to 32 dB speech attenuation',
      'Connection': 'Bluetooth 5.4 Dual-Stream',
      'Charge Vault Capacity': '3 full backup charges (totaling 36 hrs)',
      'Weight (each bud)': '4.8 grams'
    },
    colors: [
      { name: 'Minimalist Frost', hex: '#D2DAE2' },
      { name: 'Lunar Charcoal', hex: '#2A2D34' }
    ],
    stock: 30,
    popular: false
  }
];

if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(SEEDED_PRODUCTS, null, 2), 'utf8');
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf8');
}

// Make sure files are fully readable/writable by the workspace IDE
try {
  fs.chmodSync(PRODUCTS_FILE, 0o666);
  fs.chmodSync(ORDERS_FILE, 0o666);
} catch (e) {
  console.warn('Could not chmod database files:', e);
}

// Database helper functions
const getProductsData = (): any[] => {
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading products database:', err);
    return SEEDED_PRODUCTS;
  }
};

const saveProductsData = (data: any[]) => {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

const getOrdersData = (): any[] => {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading orders database:', err);
    return [];
  }
};

const saveOrdersData = (data: any[]) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// ==================== API ROUTES ====================

// Serve database configuration variables dynamically to bypass Vite's build-time bundler constraints in Cloud Run
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  });
});

// Admin Validation (Secure server-side validation)
app.post('/api/admin/verify', (req, res) => {
  const { passcode } = req.body;
  
  // SECURE: Use system environment passcode variable. If it is configured, strictly enforce it.
  const inputPasscode = (passcode || '').trim();
  let validPasscodes: string[] = [];
  
  if (process.env.ADMIN_PASSCODE) {
    const envCode = process.env.ADMIN_PASSCODE.trim();
    if (envCode) {
      validPasscodes = [envCode];
    }
  }
  
  // If no custom passcode is configured, fall back to default development passcodes so they can login out-of-the-box.
  if (validPasscodes.length === 0) {
    validPasscodes = ['readersonic2026', 'admin123'];
  }

  if (inputPasscode && validPasscodes.includes(inputPasscode)) {
    res.json({ success: true, token: 'reader_sonic_secure_admin_session_token_' + Date.now() });
  } else {
    res.status(401).json({ success: false, error: 'ACCESS DENIED. INVALID CREDENTIALS.' });
  }
});

// Products CRUD
app.get('/api/products', (req, res) => {
  const products = getProductsData();
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const products = getProductsData();
  const found = products.find(p => p.id === req.params.id);
  if (found) {
    res.json(found);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.post('/api/products', (req, res) => {
  const products = getProductsData();
  const newProd = req.body;
  
  if (!newProd.id) {
    newProd.id = `prod_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  products.push(newProd);
  saveProductsData(products);
  res.status(201).json(newProd);
});

app.put('/api/products/:id', (req, res) => {
  const products = getProductsData();
  const id = req.params.id;
  const updatedProd = req.body;

  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updatedProd, id };
    saveProductsData(products);
    res.json(products[index]);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const products = getProductsData();
  const id = req.params.id;

  const filtered = products.filter(p => p.id !== id);
  saveProductsData(filtered);
  res.json({ success: true, message: 'Product cleanup completed' });
});

// Orders CRUD
app.get('/api/orders', (req, res) => {
  const orders = getOrdersData();
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const orders = getOrdersData();
  const newOrder = req.body;
  
  // Default values
  newOrder.payment_method = newOrder.payment_method || 'COD';
  newOrder.payment_status = newOrder.payment_status || 'unpaid';
  newOrder.order_status = newOrder.order_status || 'pending';
  newOrder.status = newOrder.status || 'pending';

  orders.unshift(newOrder);
  saveOrdersData(orders);

  // Reduce inventory stock based on purchased items
  const products = getProductsData();
  if (newOrder.items && Array.isArray(newOrder.items)) {
    newOrder.items.forEach((item: any) => {
      const p = products.find((prod: any) => prod.id === item.product.id);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
      }
    });
    saveProductsData(products);
  }

  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const orders = getOrdersData();
  const id = req.params.id;
  const updates = req.body;

  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders[index] = {
      ...orders[index],
      ...updates,
      payment_status: updates.payment_status || orders[index].payment_status,
      order_status: updates.order_status || orders[index].order_status || updates.status || orders[index].status,
      status: updates.order_status || updates.status || orders[index].status
    };
    saveOrdersData(orders);
    res.json(orders[index]);
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  const orders = getOrdersData();
  const id = req.params.id;
  const filtered = orders.filter(o => o.id !== id);
  saveOrdersData(filtered);
  res.json({ success: true, message: 'Order reference cleaned up successfully.' });
});

// ==================== VITE MIDDLEWARE SETUP ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Server active on http://localhost:${PORT}`);
  });
}

startServer();
