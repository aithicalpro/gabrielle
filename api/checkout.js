const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  const {
    foh = 0,
    boh = 0,
    mo = 0,
    signingTotal = 0,
    services = {},
  } = req.body || {};

  if (!signingTotal || signingTotal <= 0) {
    return res.status(400).json({ error: 'Invalid package total.' });
  }

  const lineItems = [];

  // Front of House deposit
  if (foh > 0) {
    const fohDeposit = services.fohUpfront
      ? Math.round(foh * 0.9)
      : Math.round(foh * 0.5);
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: services.fohUpfront
            ? 'Front of the House — Paid in Full (10% off)'
            : 'Front of the House — Day 0 Deposit (50%)',
          description: 'gabriellewinters.com • Google Business Profile • AI Search Setup • NYC Market Data Feed',
        },
        unit_amount: fohDeposit * 100,
      },
      quantity: 1,
    });
  }

  // Back of House deposit
  if (boh > 0) {
    const bohDeposit = services.bohUpfront
      ? Math.round(boh * 0.9)
      : Math.round(boh * 0.5);
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: services.bohUpfront
            ? 'Back of the House — Paid in Full (10% off)'
            : 'Back of the House — Day 0 Deposit (50%)',
          description: 'Gabrielle Winters Operating System • Document Automation • CRM Migration',
        },
        unit_amount: bohDeposit * 100,
      },
      quantity: 1,
    });
  }

  if (lineItems.length === 0) {
    return res.status(400).json({ error: 'No items selected.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      metadata: {
        client: 'Gabrielle Winters',
        foh_total: String(foh),
        boh_total: String(boh),
        monthly: String(mo),
        signing_total: String(signingTotal),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
