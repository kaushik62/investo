const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

let stripe;
const getStripe = () => {
  if (!stripe) stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  return stripe;
};

router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const s = getStripe();
    const user = await User.findById(req.user._id);
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await s.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
    }

    const session = await s.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PREMIUM_PRICE_ID,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: { userId: user._id.toString() }
    });

    await User.findByIdAndUpdate(user._id, { 'subscription.stripeCustomerId': customerId });
    res.json({ success: true, data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const s = getStripe();
    const user = await User.findById(req.user._id);
    if (!user.subscription?.stripeSubscriptionId) {
      return res.status(400).json({ success: false, error: 'No active subscription found' });
    }
    await s.subscriptions.cancel(user.subscription.stripeSubscriptionId);
    user.subscription.status = 'canceled';
    user.subscription.plan = 'free';
    await user.save();
    res.json({ success: true, message: 'Subscription canceled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/subscription-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user.subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  const s = getStripe();
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = s.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          'subscription.plan': 'premium',
          'subscription.status': 'active',
          'subscription.stripeSubscriptionId': session.subscription,
          'subscription.stripeCustomerId': session.customer
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await User.findOneAndUpdate(
        { 'subscription.stripeSubscriptionId': sub.id },
        { 'subscription.plan': 'free', 'subscription.status': 'canceled' }
      );
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await User.findOneAndUpdate(
          { 'subscription.stripeSubscriptionId': invoice.subscription },
          { 'subscription.status': 'active', 'subscription.currentPeriodEnd': new Date(invoice.period_end * 1000) }
        );
      }
      break;
    }
  }
  res.json({ received: true });
});

module.exports = router;
