const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getStripe, STRIPE_WEBHOOK_SECRET } = require("../../config");
const { logEvent, logError } = require("../../logger");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function createCheckout(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }

  const stripe = getStripe();
  const uid = context.auth.uid;
  const email = context.auth.token.email || "";
  const { priceId, plan, billing } = data;

  if (!priceId) {
    throw new functions.https.HttpsError("invalid-argument", "priceId é obrigatório");
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    let customerId = userDoc.exists ? userDoc.data().stripeCustomerId : null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        metadata: { firebaseUID: uid }
      });
      customerId = customer.id;
      await db.collection("users").doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 30,
        metadata: { firebaseUID: uid, plan: plan || "pro" }
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.sibanki.com.br/app/?checkout=success",
      cancel_url: "https://www.sibanki.com.br/app/?checkout=cancel",
      metadata: { firebaseUID: uid, plan: plan || "pro", billing: billing || "monthly" }
    });

    logEvent("billing", "checkout_session_created", {
      uid,
      priceId,
      plan: plan || "pro",
      billing: billing || "monthly",
      sessionId: session.id
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    logError("billing", "checkout_error", error, { uid, priceId });
    throw new functions.https.HttpsError("internal", error.message);
  }
}

async function createPortal(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }

  const stripe = getStripe();
  const uid = context.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();
  const customerId = userDoc.exists ? userDoc.data().stripeCustomerId : null;

  if (!customerId) {
    throw new functions.https.HttpsError("not-found", "Nenhuma assinatura encontrada");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://www.sibanki.com.br/app/"
    });
    logEvent("billing", "portal_session_created", { uid, customerId });
    return { url: session.url };
  } catch (error) {
    logError("billing", "portal_error", error, { uid, customerId });
    throw new functions.https.HttpsError("internal", error.message);
  }
}

async function getUserPlan(data, context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login necessário");
  }

  const uid = context.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    return { plan: "free", status: "active", trialEnd: null };
  }

  const userData = userDoc.data();
  return {
    plan: userData.plan || "free",
    status: userData.subscriptionStatus || "active",
    trialEnd: userData.trialEnd || null,
    subscriptionId: userData.subscriptionId || null,
    currentPeriodEnd: userData.currentPeriodEnd || null,
    cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false
  };
}

async function handleStripeWebhook(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const stripe = getStripe();
  let event;

  if (!STRIPE_WEBHOOK_SECRET) {
    logError("billing", "stripe_webhook_no_secret", new Error("STRIPE_WEBHOOK_SECRET não configurado"), {});
    return res.status(500).send("Webhook secret not configured");
  }

  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logError("billing", "stripe_webhook_signature_error", err, {});
    return res.status(400).send("Webhook Error: " + err.message);
  }

  logEvent("billing", "stripe_webhook_received", { eventType: event.type });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const uid = session.metadata.firebaseUID;
        const plan = session.metadata.plan || "pro";

        if (uid && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);

          await db.collection("users").doc(uid).set({
            plan: plan,
            subscriptionId: session.subscription,
            subscriptionStatus: subscription.status,
            stripeCustomerId: session.customer,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          logEvent("billing", "checkout_completed", {
            uid,
            plan,
            subscriptionId: session.subscription
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const uid = subscription.metadata.firebaseUID;

        if (uid) {
          const priceId = subscription.items.data[0]?.price?.id || "";
          let plan = "pro";
          if (priceId.includes("familia") || priceId.includes("family")) plan = "familia";

          const isActive = subscription.status === "active" || subscription.status === "trialing";

          await db.collection("users").doc(uid).set({
            plan: isActive ? plan : "free",
            subscriptionStatus: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          logEvent("billing", "subscription_updated", {
            uid,
            plan: isActive ? plan : "free",
            status: subscription.status
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const uid = subscription.metadata.firebaseUID;

        if (uid) {
          await db.collection("users").doc(uid).set({
            plan: "free",
            subscriptionStatus: "canceled",
            cancelAtPeriodEnd: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          logEvent("billing", "subscription_canceled", { uid });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const uid = sub.metadata.firebaseUID;
          if (uid) {
            await db.collection("users").doc(uid).set({
              subscriptionStatus: "active",
              lastPayment: new Date().toISOString(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            logEvent("billing", "invoice_paid", { uid, subscriptionId: subId });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const uid = sub.metadata.firebaseUID;
          if (uid) {
            await db.collection("users").doc(uid).set({
              subscriptionStatus: "past_due",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            logEvent("billing", "invoice_payment_failed", { uid, subscriptionId: subId });
          }
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logError("billing", "stripe_webhook_processing_error", error, {
      eventType: event && event.type
    });
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createCheckout,
  createPortal,
  getUserPlan,
  handleStripeWebhook
};

