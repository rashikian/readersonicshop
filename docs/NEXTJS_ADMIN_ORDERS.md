# Supabase Admin Order Management Board in Next.js

This integration guide explains how to construct a robust, high-fidelity **Order Management & Fulfillment Board** in Next.js (App Router) backed by Supabase. It implements real-time order lists, customer details, product items retrieval, search, filter gates, and instant state mutations matching the required statuses: **Pending**, **Paid**, **Shipped**, and **Delivered**.

---

## 1. Supabase Orders Schema & Security

Ensure your `orders` table is equipped with appropriate indices, constraints, and Row Level Security (RLS) configuration. Run this inside your **Supabase SQL Editor** to support the requested status states:

```sql
-- Ensure status utilizes standard compliance values
ALTER TABLE public.orders 
    DROP CONSTRAINT IF EXISTS chk_order_status,
    ADD CONSTRAINT chk_order_status CHECK (status IN ('pending', 'paid', 'shipped', 'delivered'));

-- Add high-speed indexing for database queries sorted by status or date
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders(created_at DESC);

-- Allow only authorized administrators to update order status values
CREATE POLICY "Allow administrators to update status" ON public.orders
    FOR UPDATE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
        auth.jwt() ->> 'email' = 'muntazirrashik@gmail.com'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
        auth.jwt() ->> 'email' = 'muntazirrashik@gmail.com'
    );
```

---

## 2. Page Directory Layout Pattern

Create these structural files inside the Next.js `app/admin/orders/` subdirectory:

```bash
app/
└── admin/
    └── orders/
        ├── page.tsx               # Server Component: Secure auth guarding and joint pre-fetching
        ├── loading.tsx            # Suspense Boundary: Skeletal shimmering dashboard panels
        └── AdminOrdersBoard.tsx   # Client Component: Responsive filters, order inspector, and status mutators
```

---

## 3. Server-Side Page Entry (`app/admin/orders/page.tsx`)

This component operates as an authenticated gatekeeper on the server, fetches all order details along with their nested items using relational joins, and supplies the state to the client interface.

```typescript
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AdminOrdersBoard from './AdminOrdersBoard';

export const dynamic = 'force-dynamic';

export interface DBOrder {
  id: string;
  shipping_details: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  created_at: string;
  order_items: Array<{
    id: number;
    product_id: string;
    quantity: number;
    selected_color: string;
    price_at_purchase: number;
    products: {
      name: string;
    } | null;
  }>;
}

export default async function AdminOrdersPage() {
  const supabase = createClient();

  // 1. Authenticate user session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/signin?callbackUrl=/admin/orders');
  }

  // 2. Validate administrator privileges
  const isAdmin = 
    user.user_metadata?.role === 'admin' || 
    user.email === 'muntazirrashik@gmail.com';

  if (!isAdmin) {
    redirect('/unauthorized');
  }

  // 3. Fetch comprehensive order ledger with joined items
  const { data: ordersData, error } = await supabase
    .from('orders')
    .select(`
      id,
      shipping_details,
      subtotal,
      discount,
      tax,
      total,
      status,
      created_at,
      order_items (
        id,
        product_id,
        quantity,
        selected_color,
        price_at_purchase,
        products (
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to pre-fetch client order ledger:', error.message);
  }

  // Map database entries to clean front-end domain interfaces
  const mappedOrders = (ordersData || []).map((o: any) => ({
    id: o.id,
    createdAt: o.created_at,
    shippingDetails: o.shipping_details,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    total: Number(o.total),
    status: o.status,
    items: (o.order_items || []).map((item: any) => ({
      id: String(item.id),
      productId: item.product_id,
      productName: item.products?.name || 'Unknown Artifact',
      price: Number(item.price_at_purchase),
      quantity: item.quantity,
      selectedColor: item.selected_color,
    })),
  }));

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AdminOrdersBoard initialOrders={mappedOrders} />
      </div>
    </main>
  );
}
```
