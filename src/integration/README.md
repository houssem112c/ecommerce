Payment integration — quick guide
================================

This folder contains a copy-pasteable example for integrating the payment gateway used by this project.

Files
- `payment-integration.example.ts` — Express + Prisma example implementing:
  - `POST /orders/:orderId/initiate-payment` — server-side initiation
  - `POST /webhook/payment` — webhook receiver
  - helpers: `checkTransaction`, DB updates

Beginner step-by-step
1. Create an order in your app when a customer checks out (status: `PENDING`).
2. Call your server endpoint `POST /orders/:orderId/initiate-payment` from your backend (not from client JS).
   - This endpoint calls the gateway `POST /transaction/payment/initiate` with the `x-api-key` header.
   - Save the returned `transactionId` on your order (column: `paymentTransactionId`).
   - Return a redirect URL to the frontend payment UI where the customer completes payment.
3. The frontend payment UI will poll `GET /transaction/{transactionId}` (public API) and allow proof uploads if required.
4. The gateway will POST to your `POST /webhook/payment` endpoint when the transaction status changes.
   - The webhook handler should confirm the transaction via `GET /transaction/{transactionId}` and update your order to `PAID` or `FAILED`.

Environment variables
- `PAYMENT_API_URL` — gateway base URL (example: `https://p2-back.onrender.com`)
- `PAYMENT_API_KEY` — website API key (send as `x-api-key` header)
- `FRONTEND_PAYMENT_URL` — optional frontend payment UI base URL

Notes
- Validate webhook signatures if your gateway provides one.
- Adapt DB calls if you do not use Prisma.
- Test end-to-end using the Test API key before switching to Production keys.
