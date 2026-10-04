// Checkout endpoint blueprint.
// Install: npm install stripe
//
// IMPORTANT: STRIPE_SECRET_KEY must exist only on the server.
// The browser sends product IDs/quantities; the server re-reads prices
// from the database and creates the Checkout Session.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(req, res, db) {
  const { items, customerEmail } = req.body;

  // 1. Validate items.
  // 2. Fetch current prices and stock from DB.
  // 3. Reject unavailable/invalid items.
  // 4. Create a Stripe Checkout Session using server-side prices.
  // 5. Store an order with status pending_payment.
  // 6. Return session.url or session.id.

  // Example line-item shape:
  // line_items: [{price_data:{currency:'eur',product_data:{name:'...'},unit_amount:11999},quantity:1}]

  res.json({ message: 'Implement with your Stripe account credentials.' });
}

export async function stripeWebhook(req, res) {
  // Verify Stripe signature using STRIPE_WEBHOOK_SECRET.
  // On checkout.session.completed:
  //   - mark order paid
  //   - decrement/reserve stock transactionally
  //   - record payment reference
  // Never trust a browser redirect as proof of payment.
  res.json({ received: true });
}
