# Supabase Admin Dashboard in Next.js (App Router)

This setup guide details how to build a highly secure, protected **Administrative Control Panel** in Next.js (App Router) to manage your product catalog (inserting new items, updating specifications, refreshing stock levels) and monitor customer shipments retrieved from your Supabase PostgreSQL databases.

---

## 1. Directory Structure

Place these matching files under your Next.js directory inside `app/admin/`:

```bash
app/
└── admin/
    ├── page.tsx               # Server Component: Verifies session & role authorizations
    ├── loading.tsx            # Suspense Boundary: Renders shimmering bento grids
    └── AdminDashboard.tsx      # Client Component: Tab control, catalog listings forms, and order states
```

---

## 2. Server-Side Route Guard & Pre-Fetcher (`app/admin/page.tsx`)

This is a React Server Component. It retrieves the current authenticated user's session from Supabase, checks if their email matches administrative wildcards or customized JWT role claims, fetches unified lists of products and customer orders directly, and outputs them safely.

```typescript
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = createClient();

  // 1. Fetch current active session securely
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    // Redirect unauthenticated clients to global sign-in route
    redirect('/auth/signin?callbackUrl=/admin');
  }

  // 2. Validate administrative permissions scope
  const userEmail = user.email || '';
  const userRole = user.user_metadata?.role || '';
  
  const isAdmin = 
    userRole === 'admin' || 
    userEmail.endsWith('@readersonic.tech') ||
    userEmail === 'muntazirrashik@gmail.com'; // Allow current owner explicitly for preview

  if (!isAdmin) {
    // If authenticated user is an external customer, deny access
    redirect('/unauthorized');
  }

  // 3. Retrieve products list
  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  // 4. Retrieve complete orders list including line-item join queries
  const { data: ordersData } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      shipping_details,
      subtotal,
      discount,
      shipping,
      tax,
      total,
      status,
      coupon_code,
      created_at,
      order_items (
        id,
        product_id,
        product_name,
        price,
        quantity,
        selected_color
      )
    `)
    .order('created_at', { ascending: false });

  // Map products
  const products = (productsData || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    longDescription: p.long_description || p.description,
    price: Number(p.price),
    rating: Number(p.rating || 4.5),
    reviewsCount: p.reviews_count || 0,
    images: p.images || [],
    features: p.features || [],
    specs: p.specs || {},
    colors: p.colors || [],
    stock: p.stock || 0,
    popular: p.popular || false,
  }));

  // Map orders
  const orders = (ordersData || []).map((o: any) => ({
    id: o.id,
    userId: o.user_id,
    shippingDetails: typeof o.shipping_details === 'string'
      ? JSON.parse(o.shipping_details)
      : o.shipping_details,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    shipping: Number(o.shipping),
    tax: Number(o.tax),
    total: Number(o.total),
    status: o.status,
    couponCode: o.coupon_code || null,
    createdAt: o.created_at,
    items: (o.order_items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name || 'Legacy product SKU',
      price: Number(item.price),
      quantity: item.quantity,
      selectedColor: item.selected_color || null,
    })),
  }));

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AdminDashboard initialProducts={products} initialOrders={orders} activeAdminUser={user} />
      </div>
    </main>
  );
}
```

---

## 3. Shimmering Loading Placeholder Layout (`app/admin/loading.tsx`)

This prevents content shifts by rendering a high-fidelity shimmer representation of the metric grids and lists.

```jsx
export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10 animate-pulse">
        {/* Title Bar Shimmer */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-neutral-200 rounded w-48" />
            <div className="h-4 bg-neutral-200 rounded w-72" />
          </div>
          <div className="h-10 bg-neutral-200 rounded w-32" />
        </div>

        {/* Performance Metric Bento Grids */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#EAE5DA] p-6 rounded-2xl h-24" />
          ))}
        </div>

        {/* Table/List Block Shimmer */}
        <div className="bg-[#FAF7F1] border border-neutral-200 rounded-3xl p-6 h-[400px]" />
      </div>
    </div>
  );
}
```

---

## 4. Key Management Features
On the interactive `AdminDashboard.tsx` panel, we integrate these features:
- **Financial Statistics Deck**: Aggregates live gross revenue tallies, volume totals, inventory alerts, and average order values dynamically from database records.
- **Product Creator Form**: Allows uploading catalog entries, selecting category classification, allocating stock units, and specifying tags.
- **Dynamic Status Updates**: Modifies order rows in real-time inside `public.orders` to trigger state updates (e.g. updating a shipment to `completed` or `shipped`).
