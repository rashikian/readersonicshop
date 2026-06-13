/**
 * READY-TO-USE BLUEPRINT FOR NEXT.JS ROUTE HANDLER (APP ROUTER)
 * File Location: app/api/checkout/route.ts
 * 
 * Secure Checkout API Route that:
 * 1. Validates the incoming shipping form payload and cart item arrays.
 * 2. Fetches current real prices from Supabase database to prevent client-side price tampering.
 * 3. Re-calculates cart subtotal, verified coupon discount (SPACE10 or SONIC20), shipping fees, and sales tax.
 * 4. Inserts the main parent transaction into `public.orders` table.
 * 5. Performs a bulk insert of matching line items in the `public.order_items` table.
 * 6. Responds with JSON payload for order tracking/confirmation.
 */

import { createClient } from '@supabase/supabase-js';

// -------------------------------------------------------------
// 1. DATA TYPES & PAYLOAD STRUCTURES
// -------------------------------------------------------------
interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

interface IncomingCartItem {
  id: string; // Product SKU ID (e.g. 'prod_1')
  selectedColor: string;
  quantity: number;
}

interface CheckoutRequestPayload {
  userId?: string; // Optional user account mapping
  shippingDetails: ShippingDetails;
  items: IncomingCartItem[];
  promoCode?: string; // Opt-in checkout coupons
}

// -------------------------------------------------------------
// 2. MAIN APP ROUTER ROUTE POST HANDLER
// -------------------------------------------------------------
export async function POST(req: Request) {
  try {
    // A. Parse and validate the request body
    const body: CheckoutRequestPayload = await req.json();
    const { userId, shippingDetails, items, promoCode } = body;

    if (!shippingDetails || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: Shipping details and non-empty items array are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { fullName, email, phone, address, city, postalCode } = shippingDetails;
    if (!fullName || !email || !phone || !address || !city || !postalCode) {
      return new Response(
        JSON.stringify({ error: 'Missing shipping form variables inside shippingDetails.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // B. Initialize the Supabase Client safely using non-public environment variables.
    // SECURE: Server-side environment variables (without NEXT_PUBLIC_) keep the service-role key hidden.
    // We strictly use non-public server variables to initialize client to prevent security leaks.
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Must not fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY on server as it bypasses critical policies incorrectly

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase server configuration variables are missing. Securely configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // C. ENFORCE AUTHENTICATION CHECKS (User Spoofing Defense)
    // If the order payload is associated with a specific user (userId), verify that the request
    // originates from that actual authenticated user.
    if (userId) {
      const authHeader = req.headers.get('Authorization');
      const token = authHeader ? authHeader.replace('Bearer ', '') : null;

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized checkout: Active session authentication token is required when submitting a userId.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Initialize an analytical client to verify user token validity with Supabase Auth
      const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseServiceKey, {
        auth: { persistSession: false }
      });

      const { data: { user }, error: authError } = await authClient.auth.getUser(token);

      if (authError || !user || user.id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: User authentication session mismatch or token is invalid. Spoofing attempt blocked.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // D. Server-Side Price Verification (CRITICAL: Anti-Price-Tampering validation)
    // Pull actual product entries to fetch authentic catalog prices directly from postgres DB
    const productIdsArray = items.map((i) => i.id);
    const { data: verifiedProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, price, name, stock')
      .in('id', productIdsArray);

    if (fetchError || !verifiedProducts || verifiedProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed: Unable to fetch products for verification.', details: fetchError }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Map verified products for quick O(1) server-side queries
    const productCatalog = new Map<string, { price: number; name: string; stock: number }>();
    verifiedProducts.forEach((item) => {
      productCatalog.set(item.id, {
        price: Number(item.price),
        name: item.name,
        stock: Number(item.stock),
      });
    });

    // D. Compute pricing safely on Server side
    let calculatedSubtotal = 0;
    const validatedOrderItems: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      selected_color: string;
      price_at_purchase: number;
    }> = [];

    for (const item of items) {
      const productMeta = productCatalog.get(item.id);
      if (!productMeta) {
        return new Response(
          JSON.stringify({ error: `SKU error: Product ID "${item.id}" doesn't exist in our verified catalog.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check stock status on checkout boundary
      if (productMeta.stock < item.quantity) {
        return new Response(
          JSON.stringify({ error: `Inadequate stock for "${productMeta.name}". Requested: ${item.quantity}, Available: ${productMeta.stock}.` }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const itemCost = productMeta.price * item.quantity;
      calculatedSubtotal += itemCost;

      validatedOrderItems.push({
        product_id: item.id,
        product_name: productMeta.name,
        quantity: item.quantity,
        selected_color: item.selectedColor,
        price_at_purchase: productMeta.price,
      });
    }

    // E. Coupon Assessment and Promotions Mapping
    let calculatedDiscount = 0;
    if (promoCode) {
      const formattedCode = promoCode.trim().toUpperCase();
      if (formattedCode === 'SPACE10') {
        calculatedDiscount = Number((calculatedSubtotal * 0.10).toFixed(2)); // 10% Off
      } else if (formattedCode === 'SONIC20') {
        calculatedDiscount = Number((calculatedSubtotal * 0.20).toFixed(2)); // 20% Off
      }
    }

    // F. Taxes & Shipping computation rules
    const shippingCharge = calculatedSubtotal > 150 ? 0 : 15.00;
    const salesTaxRate = 0.0825; // Standard 8.25% localized VAT
    const calculatedTax = Number(((calculatedSubtotal - calculatedDiscount) * salesTaxRate).toFixed(2));
    const calculatedTotal = Number((calculatedSubtotal - calculatedDiscount + shippingCharge + calculatedTax).toFixed(2));

    // G. Create randomized secure transaction code (e.g. RS-581024)
    const transactionSeed = Math.floor(100000 + Math.random() * 900000);
    const orderId = `RS-${transactionSeed}`;

    // H. INSERTION STAGE 1: Transaction Header (public.orders)
    const { error: insertOrderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId || null,
        shipping_details: shippingDetails, // Stores the complete form metadata block
        subtotal: calculatedSubtotal,
        discount: calculatedDiscount,
        tax: calculatedTax,
        total: calculatedTotal,
        status: 'ordered', // Default state value
      });

    if (insertOrderError) {
      return new Response(
        JSON.stringify({ error: 'DB Transaction failed on Orders header insertion', details: insertOrderError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // I. INSERTION STAGE 2: Line Items Junction (public.order_items)
    const orderItemsPayload = validatedOrderItems.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      selected_color: item.selected_color,
      price_at_purchase: item.price_at_purchase,
    }));

    const { error: insertItemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (insertItemsError) {
      // NOTE: For data durability, we can perform rollback queries here to delete the created order header,
      // assuring no orphaned orders exist.
      await supabase.from('orders').delete().eq('id', orderId);

      return new Response(
        JSON.stringify({ error: 'DB Transaction failed on Order Items bulk insertion. Row rolled back.', details: insertItemsError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // J. Success Return with metadata metrics
    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderId,
        metrics: {
          subtotal: calculatedSubtotal,
          discount: calculatedDiscount,
          shipping: shippingCharge,
          tax: calculatedTax,
          total: calculatedTotal,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (globalError: any) {
    console.error('Unified API Endpoint Exception:', globalError);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: globalError.message || String(globalError) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
