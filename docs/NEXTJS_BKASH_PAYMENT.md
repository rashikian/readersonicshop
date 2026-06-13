# bKash API (Checkout) Integration in Next.js (App Router)

This integration guide explains how to connect and deploy the **bKash Checkout Payment Gateway** in Next.js (App Router). It incorporates secure API credentials retrieval, automatic session token grants, payment creation/initiation, callback webhook redirects, payment execution, and double-entry status validation against the bKash API before updating the order as successfully paid.

---

## 1. Environment Configurations (`.env.local` / `.env.example`)

Declare the following environment variables in your server configuration panel:

```env
# bKash Gateway Credentials (Sandbox or Production)
BKASH_BASE_URL=https://checkout.sandbox.bka.sh/v1.2.0-beta
BKASH_USERNAME=your_bkash_merchant_username
BKASH_PASSWORD=your_bkash_merchant_password
BKASH_APP_KEY=your_bkash_merchant_app_key
BKASH_APP_SECRET=your_bkash_merchant_app_secret

# Internal URL for callback routing
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 2. Dynamic Integration Directory Structure

Place these API routing handlers in your Next.js directory under `app/api/payment/bkash/`:

```bash
app/
└── api/
    └── payment/
        └── bkash/
            ├── token/
            │   └── route.ts         # Internal utility helper: Retrieves or validates cached ID tokens
            ├── create/
            │   └── route.ts         # Payment Initiation: Authenticates with bKash and returns authorization link
            ├── callback/
            │   └── route.ts         # Callback handling: Handles page redirect callbacks (success, cancel, failure)
            └── verify/
                └── route.ts         # Verification flow: Double-checks transaction metadata directly via bKash query API
```

---

## 3. High-Level Integration Flow

The bKash iframe or checkout redirect integration is divided into four distinct phases:

```
[ Customer Cart ] ---> Click 'Pay with bKash' ---> Trigger API Init (/payment/bkash/create)
                                                                  |
                                              1. Exchange credentials for JWT token
                                              2. Contact bKash to request Payment URL
                                                                  |
                                                                  v
[ Callback Redirect ] <--- User enters OTP + PIN <--- [ bKash Iframe Portal ]
         |
         +--> Success! ---> Execute Payment API ---> DB update to 'paid' ---> Render Success Page
         |
         +--> Fail / Cancel ---> Rollback state ---> Render Checkout failure notice
```

---

## 4. API Endpoints Specification

### A. Create Payment Initiation
- **Endpoint**: `/api/payment/bkash/create`
- **Method**: `POST`
- **Payload**: `{ orderId: string, amount: number, callbackUrl?: string }`
- **Description**: Requests an access token, registers the transaction reference with bKash, and returns a redirect `bkashURL` to forward the client to the payment wizard.

### B. Callback Webhook Processor
- **Endpoint**: `/api/payment/bkash/callback`
- **Method**: `GET`
- **Parameters**: `?paymentID=...&status=...` (Appended automatically by bKash on redirect)
- **Description**: Receives the user check, executes the payment using the generated session token if the checkout succeeded, or executes state rollbacks if cancels or failures are captured.

### C. Direct Double-Verification Check
- **Endpoint**: `/api/payment/bkash/verify`
- **Method**: `POST`
- **Payload**: `{ paymentID: string }`
- **Description**: Secure backend query to authenticate live transaction values directly from bKash server bounds. Prevents client-side spoofing.
