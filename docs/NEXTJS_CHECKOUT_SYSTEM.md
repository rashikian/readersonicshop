# Next.js Checkout & Order Placement with Supabase (App Router)

This integration handbook details how to build a highly secure, transaction-safe **Checkout Screen** in Next.js (App Router) that evaluates cart computations (subtotals, shipping estimates, coupon discounts, and local taxes) and performs atomic insertions of finalized order headers and line-items directly into Supabase database tables.

---

## 1. Schema Specifications (Relational database structures)

Finalized orders are stored inside two related PostgreSQL tables: `orders` (acting as the transactional header containing shipping details and calculated totals) and `order_items` (containing the corresponding SKU line-items and quantities).

Ensure your database tables match our `/supabase_schema.sql` format:

```sql
-- Create the orders transactional header
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- Standardized transaction code (e.g. 'RS-128490')
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional authenticated identity
    shipping_details JSONB NOT NULL, -- Structured JSON representation of customer name, email, addresses
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'completed'
    coupon_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the order items junction table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    selected_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 2. Directory Layout
Place these files inside your Next.js project directory structure for modularity and high-fidelity loading controls:

```bash
app/
└── checkout/
    ├── page.tsx            # Server Component: Guard verification and session loader
    ├── loading.tsx         # Suspense Boundary: Shimmer loading state
    └── CheckoutContent.tsx # Client Component: Stateful shipment forms and transactional routines
```

---

## 3. Server-Side Page Entry (`app/checkout/page.tsx`)

Verifies the customer's current session parameters on the server and prepares to ingest checkout events securely.

```typescript
import { createClient } from '@/utils/supabase/server';
import CheckoutContent from './CheckoutContent';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const supabase = createClient();
  
  // Optional: Retrieve authenticated session details to prefill form values
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <CheckoutContent initialUser={user} />
      </div>
    </main>
  );
}
```

---

## 4. Price Calculations & Supabase Transaction Mechanics

Inside the `CheckoutContent.tsx` client companion code, we coordinate the following vital steps:
1. **Cart Inventory Check**: Retrieve values dynamically from your central state or context hook (`useCart()`).
2. **Promotional Evaluations**: Auto-apply validated discount coupons (e.g., `SPACE10` reducing core prices by 10%).
3. **Unified Orders Insertion**:
   - Assemble shipping payloads safely in JSON structures.
   - Fire a single network request to insert the primary order row inside public.orders.
   - Fire a batch insertion request to append matching rows inside public.order_items.
   - Wipe client-side shopping states upon transaction completion and route clients cleanly to confirmation screens.
