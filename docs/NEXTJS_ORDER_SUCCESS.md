# Next.js Transaction Success & Order Confirmation Page (App Router)

This setup guide explains how to build a dynamic, high-performance **Checkout Confirmation / Order Success Screen** in Next.js (App Router) that dynamically captures the assigned order tracking code (via query parameters such as `?orderId=RS-128490`) and fetches detailed transaction records directly from public orders tables.

---

## 1. Directory Structure

Place these dynamic files under your Next.js project inside `app/checkout/success/`:

```bash
app/
└── checkout/
    └── success/
        ├── page.tsx               # Server Component: Loads order parameters & pre-validates orders
        ├── loading.tsx            # Suspense Boundary: Renders shimmering invoice skeletons
        └── OrderSuccessContent.tsx # Client Component: Coordinates visual success indicators & actions
```

---

## 2. Server-Side Page Entry (`app/checkout/success/page.tsx`)

This Server Component extracts the order code from parameters securely, fetches the associated order line items from Supabase, and performs a safety redirect if the parameters are broken.

```typescript
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import OrderSuccessContent from './OrderSuccessContent';

interface SearchParams {
  orderId?: string;
}

interface SuccessPageProps {
  searchParams: SearchParams;
}

export const dynamic = 'force-dynamic';

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const orderId = searchParams.orderId;

  if (!orderId) {
    // If no order code is found, safety redirect back to store
    redirect('/products');
  }

  const supabase = createClient();

  // Fetch compiled order metadata
  const { data: orderDetails, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !orderDetails) {
    // If the database query failed to discover the order reference code
    console.error('Failed to resolve active order invoice reference', orderError);
  }

  // Fetch ordered items
  const { data: dbItems } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  const parsedOrder = orderDetails ? {
    id: orderDetails.id,
    subtotal: Number(orderDetails.subtotal),
    discount: Number(orderDetails.discount),
    shipping: Number(orderDetails.shipping),
    tax: Number(orderDetails.tax),
    total: Number(orderDetails.total),
    status: orderDetails.status,
    couponCode: orderDetails.coupon_code || null,
    createdAt: orderDetails.created_at,
    shippingDetails: typeof orderDetails.shipping_details === 'string'
      ? JSON.parse(orderDetails.shipping_details)
      : orderDetails.shipping_details,
  } : null;

  const parsedItems = (dbItems || []).map((item) => ({
    id: item.id,
    productName: item.product_name,
    price: Number(item.price_at_purchase || item.price),
    quantity: item.quantity,
    selectedColor: item.selected_color || null,
  }));

  return (
    <main className="min-h-screen bg-[#FAF8F5] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <OrderSuccessContent order={parsedOrder} items={parsedItems} fallbackOrderId={orderId} />
      </div>
    </main>
  );
}
```

---

## 3. Shimmering Loading Placeholder (`app/checkout/success/loading.tsx`)

```jsx
export default function SuccessLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10 animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-200" />
          <div className="h-8 bg-neutral-200 rounded w-1/3" />
          <div className="h-4 bg-neutral-200 rounded w-2/3" />
        </div>

        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-10 h-[360px]" />
      </div>
    </div>
  );
}
```
