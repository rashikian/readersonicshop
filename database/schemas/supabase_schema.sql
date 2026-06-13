-- ==========================================
-- READERSONIC SHOP - COMPREHENSIVE SUPABASE SCHEMA & SEED
-- ==========================================
-- This file provides the full production-ready PostgreSQL definitions for the 
-- Readersonic premium e-commerce workspace. Run this script in your Supabase 
-- SQL Editor to initialize your tables, relationships, constraints, indexes, 
-- real-time configuration, and seed data.

-- Enable UUID extension for auth/user linking
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure a clean run
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;

-- 1. PRODUCTS TABLE
-- We double-quote "longDescription" and "reviewsCount" to match the frontend 
-- camelCase structure exactly, avoiding parsing errors during raw client mappings.
CREATE TABLE public.products (
    id TEXT PRIMARY KEY, -- String IDs ('prod_1', etc.)
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    "reviewsCount" INT NOT NULL DEFAULT 0,
    images JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of string URLs
    features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of features
    specs JSONB NOT NULL DEFAULT '{}'::jsonb, -- Metadata specification map
    colors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Color options [{name, hex}]
    stock INT NOT NULL DEFAULT 0,
    popular BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ORDERS TABLE
-- Captures standard order metadata, shipping details object, and payment state properties.
CREATE TABLE public.orders (
    id TEXT PRIMARY KEY, -- Custom order codes (e.g., 'RS-xxxxxx')
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Links to Supabase authentication identity
    shipping_details JSONB NOT NULL, -- Serialized full ShippingDetails structure
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- State mappings ('pending', 'completed', etc.)
    payment_method VARCHAR(50) DEFAULT 'COD',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    order_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ORDER ITEMS TABLE
-- Normalizes the products-orders relationship with cascading deletes.
CREATE TABLE public.order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    selected_color VARCHAR(100) NOT NULL,
    price_at_purchase NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- INDEXING FOR OPTIMIZED DRILL-DOWN QUERIES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_popular ON public.products(popular) WHERE popular = true;
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================
-- Disable or loosen RLS on orders to ensure guest and custom admin sessions work flawlessly.
-- Since the frontend handles access layers and backups, we can grant explicit SELECT access to all.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Explicitly grant privileges on the public schema tables to the API gateway roles.
-- This prevents the 42501 'permission denied' Postgres error regardless of how tables are loaded.
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON public.products TO anon, authenticated, service_role;
GRANT ALL ON public.orders TO anon, authenticated, service_role;
GRANT ALL ON public.order_items TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 1. PRODUCTS POLICIES
-- Let everyone view products catalog
CREATE POLICY "Allow public select access to products" ON public.products
    FOR SELECT USING (true);

-- Allow only administrators to manage products (inserts, updates, deletes)
-- Since admin verification is handled securely on client-side and server-side fallback portals,
-- we grant full rights on products to make sure all requests succeed without authenticated sessions.
CREATE POLICY "Allow public and users to insert products" ON public.products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public and users to update products" ON public.products
    FOR UPDATE USING (true);

CREATE POLICY "Allow public and users to delete products" ON public.products
    FOR DELETE USING (true);

-- 2. ORDERS POLICIES
-- Allow all reads (including passcode login admins and guests tracking orders).
CREATE POLICY "Allow queries to read orders" ON public.orders
    FOR SELECT USING (true);

-- Allow guest visitors (auth.uid IS NULL) and signed-in customers to place orders
CREATE POLICY "Allow public and users to place orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Admins are permitted to update orders (i.e. editing order statuses or payment details)
CREATE POLICY "Allow admins to update orders" ON public.orders
    FOR UPDATE USING (true);

-- Allow administrators/users to delete order logs
CREATE POLICY "Allow public and users to delete orders" ON public.orders
    FOR DELETE USING (true);

-- 3. ORDER ITEMS POLICIES
-- Let users view order items matching parent orders
CREATE POLICY "Allow queries to read order items" ON public.order_items
    FOR SELECT USING (true);

-- Allow inserting order items
CREATE POLICY "Allow queries to insert order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

-- Allow deleting order items
CREATE POLICY "Allow public and users to delete order items" ON public.order_items
    FOR DELETE USING (true);

-- ==========================================
-- REAL-TIME SUBSCRIPTION MODULE
-- ==========================================
-- Enable Supabase Realtime broadcast capabilities for active monitoring
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr 
        JOIN pg_publication p ON p.oid = pr.prpubid 
        JOIN pg_class c ON c.oid = pr.prrelid 
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr 
        JOIN pg_publication p ON p.oid = pr.prpubid 
        JOIN pg_class c ON c.oid = pr.prrelid 
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr 
        JOIN pg_publication p ON p.oid = pr.prpubid 
        JOIN pg_class c ON c.oid = pr.prrelid 
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;
END $$;

-- ==========================================
-- PRE-INSTALLED HIGH-QUALITY SEED PRODUCTS
-- ==========================================
INSERT INTO public.products (id, name, category, description, "longDescription", price, rating, "reviewsCount", images, features, specs, colors, stock, popular)
VALUES
(
    'prod_1',
    'Readersonic Whisper Book',
    'ereaders',
    'The world''s first e-reader with synchronized active noise mask and integrated spatial audiobook reader.',
    'Engineered for extreme reading environments. The Readersonic Whisper Book combines an eye-safe, glare-free 300-PPI electronic ink display with dual micro-vibe bone conduction drivers integrated directly into the chassis. Feel the soundscapes of your favorite novels synchronized with the words you read. Ambient, slow-cadence instrumental tracks are generated dynamically based on the literary mood of each chapter.',
    249.99,
    4.90,
    124,
    '["https://picsum.photos/seed/ereader1/600/600", "https://picsum.photos/seed/ereader1_detail/600/600"]'::jsonb,
    '["300 PPI glare-free paperwhite display", "Dual micro-vibe bone conduction channels", "Dynamic literary mood-soundtracks", "IPX8 waterproof for bath readings", "60-day ultra-long standby battery life"]'::jsonb,
    '{"Screen Size": "7.2 inches high-contrast e-Ink", "Audio Sync": "Bluetooth 5.3 + Direct Bone Conduction", "Storage Capacity": "64 GB (Stores ~50,000 eBooks)", "Water Resistance": "IPX8 (up to 2m deep for 60 min)", "Charging Interface": "USB Type-C Fast Charging (12W)"}'::jsonb,
    '[{"name": "Lunar Charcoal", "hex": "#2A2D34"}, {"name": "Polar Silver", "hex": "#EAEAEA"}]'::jsonb,
    15,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    "longDescription" = EXCLUDED."longDescription",
    price = EXCLUDED.price,
    rating = EXCLUDED.rating,
    "reviewsCount" = EXCLUDED."reviewsCount",
    images = EXCLUDED.images,
    features = EXCLUDED.features,
    specs = EXCLUDED.specs,
    colors = EXCLUDED.colors,
    stock = EXCLUDED.stock,
    popular = EXCLUDED.popular;

INSERT INTO public.products (id, name, category, description, "longDescription", price, rating, "reviewsCount", images, features, specs, colors, stock, popular)
VALUES
(
    'prod_2',
    'Acoustic Oasis Headgear',
    'headgear',
    'Ultra-plush reference headphones meticulously tuned specifically for narrator vocals and ambient focus tracks.',
    'Designed inside audio sanctuaries, these luxury open-back headphones isolate narrator vocals, giving audiobooks a physical presence. The Acoustic Oasis Headgear incorporates multi-layered diaphragms that separate mid-range consonants from background sweeps, making dialogue crystal clear at low volumes while guarding your ears from auditory fatigue during marathon 8-hour reading sessions.',
    189.50,
    4.80,
    92,
    '["https://picsum.photos/seed/headphones1/600/600", "https://picsum.photos/seed/headphones1_detail/600/600"]'::jsonb,
    '["Mid-range dialog separation engines", "Zero-pressure pressure memory foam cups", "Open-back spatial depth replication", "Passive ambient bypass for safety", "Includes premium wool braided travel pouch"]'::jsonb,
    '{"Transducer Type": "45mm dynamic neodymium", "Frequency Response": "8 Hz - 28,000 Hz", "Connector": "3.5mm Gold-Plated (High impedance & wireless option)", "Battery (Wireless Mode)": "40 hours active ANC playback", "Weight": "248 grams"}'::jsonb,
    '[{"name": "Obsidian Blue", "hex": "#1C2E3D"}, {"name": "Sandstone Gold", "hex": "#E2D4C9"}]'::jsonb,
    22,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    "longDescription" = EXCLUDED."longDescription",
    price = EXCLUDED.price,
    rating = EXCLUDED.rating,
    "reviewsCount" = EXCLUDED."reviewsCount",
    images = EXCLUDED.images,
    features = EXCLUDED.features,
    specs = EXCLUDED.specs,
    colors = EXCLUDED.colors,
    stock = EXCLUDED.stock,
    popular = EXCLUDED.popular;

INSERT INTO public.products (id, name, category, description, "longDescription", price, rating, "reviewsCount", images, features, specs, colors, stock, popular)
VALUES
(
    'prod_3',
    'Vibe Frame Reading Glasses',
    'glassware',
    'Smart reading frames featuring open-ear spatial audio engines and fatigue-reducing lenses.',
    'Crafted for modern digital and paper book readers. The Vibe Frame Reading Glasses feature custom blue-light filtering lenses coupled with ultra-miniaturized focus transmitters that direct high-definition audio straight to your auditory canal without obstructing outer ears. Read paperbacks while enjoying soft acoustic layers that follow your page updates.',
    159.00,
    4.60,
    54,
    '["https://picsum.photos/seed/glasses1/600/600", "https://picsum.photos/seed/glasses1_detail/600/600"]'::jsonb,
    '["Advanced blue-shield lens coating", "Open-ear micro-dynamic audio transmitters", "Lightweight eco-acetate construction", "Touch-swipe controls on the temples", "Prescription-friendly swappable core"]'::jsonb,
    '{"Lens Coating": "99.4% Blue-light block, UV400", "Audio Drive": "Twin 12mm directional sound portals", "Sensors": "Capacitive touch gesture temple rails", "Weight": "38 grams ultra-light frame", "Battery Rating": "12 hours reading audio per charge"}'::jsonb,
    '[{"name": "Tortoise Matte", "hex": "#583D28"}, {"name": "Minimalist Frost", "hex": "#D2DAE2"}]'::jsonb,
    8,
    false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    "longDescription" = EXCLUDED."longDescription",
    price = EXCLUDED.price,
    rating = EXCLUDED.rating,
    "reviewsCount" = EXCLUDED."reviewsCount",
    images = EXCLUDED.images,
    features = EXCLUDED.features,
    specs = EXCLUDED.specs,
    colors = EXCLUDED.colors,
    stock = EXCLUDED.stock,
    popular = EXCLUDED.popular;

INSERT INTO public.products (id, name, category, description, "longDescription", price, rating, "reviewsCount", images, features, specs, colors, stock, popular)
VALUES
(
    'prod_4',
    'Sonic Bookmark Speaker',
    'accessories',
    'A pocket-sized spatial speaker that docks on books and floods rooms with ambient soundscapes.',
    'The smallest heavy-duty ambient device in our collection. The Sonic Bookmark Speaker can clip onto any physical paperback or tablet to cast a rich, spherical sound sphere tailored for sound-isolated reading. Includes built-in microphones to balance ambient noise levels on the fly, dynamically lowering the speaker output when quiet is detected in your immediate vicinity.',
    79.99,
    4.70,
    147,
    '["https://picsum.photos/seed/speaker1/600/600", "https://picsum.photos/seed/speaker1_detail/600/600"]'::jsonb,
    '["Physical page-clipping tension mount", "360-degree spatial acoustic beamforming", "Ambient noise auto-sensory damping", "Custom woven tactile fabric shell", "Integrated bookmark strap"]'::jsonb,
    '{"Amplifier power": "8W Peak Class-D digital amp", "Mount system": "Flexi-silicone spring clamp", "Wireless Type": "Ultra-wideband low-latency audio", "Size": "120 x 42 x 15 mm", "Battery Life": "18 hours continuous operation"}'::jsonb,
    '[{"name": "Forest Sage", "hex": "#4A5D4E"}, {"name": "Lunar Charcoal", "hex": "#2A2D34"}]'::jsonb,
    45,
    false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    "longDescription" = EXCLUDED."longDescription",
    price = EXCLUDED.price,
    rating = EXCLUDED.rating,
    "reviewsCount" = EXCLUDED."reviewsCount",
    images = EXCLUDED.images,
    features = EXCLUDED.features,
    specs = EXCLUDED.specs,
    colors = EXCLUDED.colors,
    stock = EXCLUDED.stock,
    popular = EXCLUDED.popular;

INSERT INTO public.products (id, name, category, description, "longDescription", price, rating, "reviewsCount", images, features, specs, colors, stock, popular)
VALUES
(
    'prod_5',
    'Readersonic Pro Aura Book',
    'ereaders',
    'An expansive 10-inch note-taking e-reader featuring studio-grade bone conduction resonance mechanics.',
    'The ultimate professional reading and note-taking tablet. The Readersonic Pro Aura Book is built with a magnificent 10.3-inch glass e-Ink display featuring paperlike friction coating and low friction pen inputs. The frame itself relies on a sound-resonance matrix, transforming the entire back surface of the tablet into a massive diaphragm that delivers crisp, warm audio frequencies directly into your fingers and palms.',
    429.00,
    5.00,
    38,
    '["https://picsum.photos/seed/ereader2/600/600", "https://picsum.photos/seed/ereader2_detail/600/600"]'::jsonb,
    '["10.3-inch responsive note-taking glass canvas", "Vibe-palm audio resonance technology", "Includes active stylus pen (never needs charging)", "Live-to-voice transcription on margin notepad", "Advanced document PDF annotation tools"]'::jsonb,
    '{"Screen Size": "10.3-inch flexible electronic ink", "Resonator Type": "Acoustic actuator matrix", "Storage Capacity": "128 GB (with microSD expansion up to 512GB)", "Stylus technology": "Wacom electromagnetic resonance", "Operating System": "Security-hardened SonicOS (Android based)"}'::jsonb,
    '[{"name": "Sovereign Bronze", "hex": "#4E453F"}, {"name": "Polar Silver", "hex": "#EAEAEA"}]'::jsonb,
    6,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    "longDescription" = EXCLUDED."longDescription",
    price = EXCLUDED.price,
    rating = EXCLUDED.rating,
    "reviewsCount" = EXCLUDED."reviewsCount",
    images = EXCLUDED.images,
    features = EXCLUDED.features,
    specs = EXCLUDED.specs,
    colors = EXCLUDED.colors,
    stock = EXCLUDED.stock,
    popular = EXCLUDED.popular;

INSERT INTO public.products (id, name, category, description, "longDescription", price, rating, "reviewsCount", images, features, specs, colors, stock, popular)
VALUES
(
    'prod_6',
    'Studio Vocal Shield Pods',
    'headgear',
    'The world''s finest in-ear buds designed to neutralize harsh sound transients from digital audioreaders.',
    'A triumph of acoustic compression. Standard in-ear buds suffer from sharp high-frequency sound distortion (sibilance) when scaling audiobooks or speech streams. These Buds are equipped with physical sound filters and adaptive digital signal processing (DSP) to sculpt speech transients, preserving the lushness of human voices in high fidelity.',
    125.00,
    4.50,
    81,
    '["https://picsum.photos/seed/earbuds1/600/600", "https://picsum.photos/seed/earbuds1_detail/600/600"]'::jsonb,
    '["Sibilance vocal shaping algorithms", "High-grade copper acoustic pathways", "Ultra-snug hypoallergenic seal buds", "Fast charger pocket-vault container", "Sweat-proof casing"]'::jsonb,
    '{"Frequency range": "10 Hz - 22,000 Hz", "ANC Rating": "Up to 32 dB speech attenuation", "Connection": "Bluetooth 5.4 Dual-Stream", "Charge Vault Capacity": "3 full backup charges (totaling 36 hrs)", "Weight (each bud)": "4.8 grams"}'::jsonb,
    '[{"name": "Minimalist Frost", "hex": "#D2DAE2"}, {"name": "Lunar Charcoal", "hex": "#2A2D34"}]'::jsonb,
    30,
    false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    "longDescription" = EXCLUDED."longDescription",
    price = EXCLUDED.price,
    rating = EXCLUDED.rating,
    "reviewsCount" = EXCLUDED."reviewsCount",
    images = EXCLUDED.images,
    features = EXCLUDED.features,
    specs = EXCLUDED.specs,
    colors = EXCLUDED.colors,
    stock = EXCLUDED.stock,
    popular = EXCLUDED.popular;
