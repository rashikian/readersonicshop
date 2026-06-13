# Supabase Admin Product CRUD System in Next.js (App Router)

This integration guide explains how to build a dynamic, secure, and production-ready **Product Inventory CRUD (Create, Read, Update, Delete) System** in Next.js (App Router) using a Supabase PostgreSQL database. It covers database schema declarations, real-time client state hydration, input validation, and secure execution of data mutations.

---

## 1. Supabase Database Schema

Run the following SQL statement in the **Supabase SQL Editor** to bootstrap the `products` table with complete typing constraints, default values, and column specifications:

```sql
-- Create the product inventory table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY, -- String-based SKU ID (e.g., 'prod_4821')
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    long_description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.50,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    images TEXT[] NOT NULL DEFAULT '{}'::text[],
    features TEXT[] NOT NULL DEFAULT '{}'::text[],
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    colors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of items e.g., [{"name": "Lunar Charcoal", "hex": "#2A2D34"}]
    stock INTEGER NOT NULL DEFAULT 0,
    popular BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow public read access" ON public.products
    FOR SELECT USING (true);

-- Restrict mutations (INSERT, UPDATE, DELETE) to administrators only
CREATE POLICY "Allow admin write access" ON public.products
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'muntazirrashik@gmail.com' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );
```

---

## 2. Directory Structure

Place these dynamic files in your Next.js directory under `app/admin/products/`:

```bash
app/
└── admin/
    └── products/
        ├── page.tsx               # Server Component: Redirect gatekeeper and data pre-fetcher
        ├── loading.tsx            # Suspense Boundary: Renders shimmering inventory grids
        └── AdminProductManager.tsx # Client Component: Unified CRUD form, validators, and table actions
```

---

## 3. Server-Side Page Entry (`app/admin/products/page.tsx`)

This Server Component ensures the active user is authorized, pre-fetches products directly from Supabase, and delivers the collection to the client manager.

```typescript
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AdminProductManager from './AdminProductManager';

export const dynamic = 'force-dynamic';

export interface DatabaseProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  long_description: string;
  price: number;
  stock: number;
  colors: any;
  features: string[];
  specs: any;
  images: string[];
}

export default async function AdminProductsPage() {
  const supabase = createClient();

  // 1. Authenticate user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/signin?callbackUrl=/admin/products');
  }

  // 2. Validate admin role claims or email
  const isAdmin = 
    user.user_metadata?.role === 'admin' || 
    user.email === 'muntazirrashik@gmail.com';

  if (!isAdmin) {
    redirect('/unauthorized');
  }

  // 3. Retrieve verified catalog
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to pre-fetch admin products list:', error.message);
  }

  // Map to unified frontend interface
  const mappedProducts = (products || []).map((p: DatabaseProduct) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    longDescription: p.long_description || p.description,
    price: Number(p.price),
    stock: p.stock,
    colors: p.colors || [],
    features: p.features || [],
    specs: p.specs || {},
    images: p.images || [],
  }));

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AdminProductManager initialProducts={mappedProducts} />
      </div>
    </main>
  );
}
```
