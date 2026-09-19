require("dotenv").config();

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const Stripe = require("stripe");
const email = require("./email");
const { buildTermsPdf } = require("./pdf");
const { getTerms, TERMS_VERSION } = require("./terms");
const {
  publicUrl,
  signToken,
  verifyToken,
  isStripeConfigured,
  stripePriceId,
  getPlan,
  planFromPriceId,
  publicConfig,
  parseCookies,
  sessionCookie,
  clearSessionCookie,
  periodEndUnix,
  formatDateFromUnix,
  statusLabel,
  formatMoneyFromStripe,
} = require("./config");

const app = express();
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);

app.use((req, _res, next) => {
  if (!process.env.VERCEL) return next();
  const current = req.url || "/";
  const pathOnly = current.split("?")[0];
  if (pathOnly.startsWith("/api")) return next();
  const headerPath = req.headers["x-invoke-path"];
  const query = current.includes("?") ? current.slice(current.indexOf("?")) : "";
  if (typeof headerPath === "string" && headerPath.startsWith("/api")) {
    req.url = headerPath.split("?")[0] + query;
    return next();
  }
  req.url = "/api" + (current.startsWith("/") ? current : `/${current}`);
  next();
});

const lookupAttempts = new Map();

function stripeClient() {
  if (!isStripeConfigured()) return null;
  return new Stripe(String(process.env.STRIPE_SECRET_KEY || "").trim());
}

function checkoutErrorMessage(error) {
  const message = String(error?.message || "");
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("rak_")) {
    return "La clave de Stripe no tiene permiso para Checkout. En Developers → API keys usa una Secret key (sk_live_) o una Restricted key con Checkout Sessions: Write, Customers: Write, Prices: Read y Products: Read.";
  }
  if (lower.includes("no such price") || lower.includes("no such product")) {
    return "El Price ID no existe en esta cuenta Live de Stripe. STRIPE_PRICE_TIRA y STRIPE_PRICE_VIDEO deben ser price_... del mismo modo Live que la clave.";
  }
  if (lower.includes("tax_code") || lower.includes("managed payments")) {
    return "Stripe Managed Payments pide un código fiscal en el producto. Desactívalo en esta sesión o asigna un Product tax code en el producto de Stripe.";
  }
  if (lower.includes("one_time") || (lower.includes("recurring") && lower.includes("mode"))) {
    return "Ese precio de Stripe no es una suscripción mensual. En el producto, Billing debe ser Recurring / Monthly.";
  }
  if (message) return `Stripe: ${message}`;
  return "No se pudo abrir Stripe Checkout. Inténtalo de nuevo.";
}

function jsonError(res, status, code, message) {
  return res.status(status).json({ ok: false, error: code, message });
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function rateLimitLookup(ip) {
  const key = ip || "unknown";
  const now = Date.now();
  const entry = lookupAttempts.get(key) || { count: 0, start: now };
  if (now - entry.start > 15 * 60 * 1000) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  lookupAttempts.set(key, entry);
  return entry.count <= 8;
}

async function requireSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.membership_session;
  if (!token) {
    jsonError(res, 401, "unauthenticated", "Verifica tu email para gestionar la membresía.");
    return null;
  }
  const data = verifyToken(token);
  if (!data || data.typ !== "session") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    jsonError(res, 401, "expired", "La sesión caducó. Vuelve a verificar tu email.");
    return null;
  }
  return {
    email: data.email,
    stripe_customer_id: data.customerId,
  };
}

function serializeSubscription(subscription) {
  const price = subscription.items?.data?.[0]?.price;
  const plan = planFromPriceId(price?.id) || getPlan(subscription.metadata?.planId);
  const periodEnd = periodEndUnix(subscription);
  const status = statusLabel(subscription);
  return {
    id: subscription.id,
    planId: plan?.id || subscription.metadata?.planId || null,
    planName: plan?.name || subscription.metadata?.planName || price?.nickname || "Plan contratado",
    priceLabel:
      formatMoneyFromStripe(price?.unit_amount, price?.currency) ||
      (plan?.promotionalPrice ? `$${Number(plan.promotionalPrice).toLocaleString("en-US")}/mes` : null),
    status: status.label,
    statusKey: status.key,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodEnd: formatDateFromUnix(periodEnd),
    canceledAt: formatDateFromUnix(subscription.canceled_at),
    termsVersion: subscription.metadata?.termsVersion || null,
    termsAcceptedAt: subscription.metadata?.termsAcceptedAt || null,
  };
}

async function findCustomersByEmail(stripe, emailAddress) {
  const customers = [];
  for await (const customer of stripe.customers.list({ email: emailAddress, limit: 100 })) {
    customers.push(customer);
  }
  return customers;
}

async function subscriptionsForCustomers(stripe, customers) {
  const subscriptions = [];
  for (const customer of customers) {
    const list = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    for (const item of list.data) subscriptions.push({ customer, subscription: item });
  }
  return subscriptions;
}

let portalConfigurationId = process.env.STRIPE_PORTAL_CONFIGURATION_ID || null;

async function portalConfiguration(stripe) {
  if (portalConfigurationId) return portalConfigurationId;
  try {
    const existing = await stripe.billingPortal.configurations.list({ limit: 20 });
    const match = existing.data.find((item) => item.features?.subscription_cancel?.mode === "at_period_end");
    if (match) {
      portalConfigurationId = match.id;
      return portalConfigurationId;
    }
    const config = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Gestiona tu membresía de Publi con Jorge",
      },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
        },
      },
    });
    portalConfigurationId = config.id;
    return portalConfigurationId;
  } catch (error) {
    console.warn("[stripe] No se pudo crear la configuración del Customer Portal:", error.message);
    return null;
  }
}

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = stripeClient();
  if (!stripe) return res.status(503).send("stripe_not_configured");

  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  let event;
  try {
    if (!secret || !secret.startsWith("whsec_")) {
      return res.status(500).send("webhook_secret_missing");
    }
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch (error) {
    console.warn("[stripe] Firma de webhook inválida:", error.message);
    return res.status(400).send("invalid_signature");
  }

  try {
    await handleStripeEvent(stripe, event);
    res.json({ received: true });
  } catch (error) {
    console.error("[stripe] Error procesando webhook:", error);
    res.status(500).send("webhook_error");
  }
});

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  if (req.path.startsWith("/server") || req.path.startsWith("/data") || req.path === "/.env") {
    return res.status(404).end();
  }
  next();
});

app.get("/api/config", (_req, res) => {
  res.json({ ok: true, ...publicConfig() });
});

app.get("/api/terms", (req, res) => {
  const plan = getPlan(String(req.query.plan || ""));
  res.json({ ok: true, terms: getTerms(plan?.name || "") });
});

app.get("/api/terms/pdf", async (req, res) => {
  try {
    const plan = getPlan(String(req.query.plan || ""));
    const pdf = await buildTermsPdf({
      planName: plan?.name || "",
      email: "",
      acceptedAt: "",
    });
    const filename = `terminos-publi-con-jorge-${TERMS_VERSION}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    console.error(error);
    jsonError(res, 500, "pdf_error", "No se pudo generar el PDF.");
  }
});

app.post("/api/checkout", async (req, res) => {
  const stripe = stripeClient();
  if (!stripe) {
    return jsonError(
      res,
      503,
      "stripe_not_configured",
      "El pago todavía no está conectado. Configura STRIPE_SECRET_KEY y los Price IDs en el servidor.",
    );
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const contactName = String(body.contactName || "").trim();
  const businessName = String(body.businessName || "").trim();
  const phone = String(body.phone || "").trim();
  const emailAddress = normalizeEmail(body.email);
  const planId = String(body.planId || "").trim();
  const termsAccepted = body.termsAccepted === true;
  const termsVersion = String(body.termsVersion || "").trim();
  const plan = getPlan(planId);
  const priceId = stripePriceId(plan);

  if (!contactName || !businessName || !phone || !emailAddress || !planId) {
    return jsonError(res, 400, "invalid", "Completa nombre, negocio, email, teléfono y el plan.");
  }
  if (!isValidEmail(emailAddress)) {
    return jsonError(res, 400, "invalid_email", "Revisa el email.");
  }
  if (!plan || plan.customPricing) {
    return jsonError(
      res,
      400,
      "not_checkoutable",
      "Este plan no se contrata con pago automático. Solicita una cotización.",
    );
  }
  if (!priceId) {
    return jsonError(
      res,
      503,
      "price_missing",
      "Este plan todavía no tiene un precio de Stripe configurado.",
    );
  }
  if (!termsAccepted || termsVersion !== TERMS_VERSION) {
    return jsonError(
      res,
      400,
      "terms_required",
      "Debes leer y aceptar la versión vigente de los Términos y Condiciones.",
    );
  }

  const acceptedAt = new Date().toISOString();
  const acceptanceId = crypto.randomUUID();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: emailAddress,
      client_reference_id: String(acceptanceId),
      success_url: `${publicUrl()}/membership?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicUrl()}/membership?status=cancelled`,
      line_items: [{ price: priceId, quantity: 1 }],
      managed_payments: { enabled: false },
      metadata: {
        planId,
        planName: plan.name,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: acceptedAt,
        contactName,
        businessName,
        phone,
        acceptanceId: String(acceptanceId),
      },
      subscription_data: {
        metadata: {
          planId,
          planName: plan.name,
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: acceptedAt,
          contactName,
          businessName,
          phone,
          acceptanceId: String(acceptanceId),
        },
      },
    });

    res.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("[stripe] checkout:", error?.type || error?.code || "", error?.message || error);
    jsonError(res, 502, "checkout_failed", checkoutErrorMessage(error));
  }
});

app.get("/api/checkout/session", async (req, res) => {
  const stripe = stripeClient();
  if (!stripe) return jsonError(res, 503, "stripe_not_configured", "Stripe no está configurado.");

  const sessionId = String(req.query.session_id || "");
  if (!sessionId.startsWith("cs_")) {
    return jsonError(res, 400, "invalid", "Sesión de pago no válida.");
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });
    if (session.mode !== "subscription") {
      return jsonError(res, 404, "not_found", "No encontramos esa membresía.");
    }

    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const customerEmail =
      session.customer_details?.email || session.customer_email || (session.customer?.email ?? "");

    if (customerId && customerEmail) {
      const token = signToken(
        { typ: "session", email: normalizeEmail(customerEmail), customerId },
        24 * 60 * 60 * 1000,
      );
      res.setHeader("Set-Cookie", sessionCookie(token));
    }

    res.json({
      ok: true,
      email: customerEmail,
      paymentStatus: session.payment_status,
      membership: subscription ? serializeSubscription(subscription) : null,
    });
  } catch (error) {
    console.error("[stripe] session:", error);
    jsonError(res, 404, "not_found", "No encontramos esa sesión de pago.");
  }
});

app.post("/api/membership/access", async (req, res) => {
  const generic = {
    ok: true,
    message:
      "Si existe una membresía con este email, te enviaremos un enlace para verificar tu identidad y acceder.",
  };

  if (!rateLimitLookup(req.ip)) {
    return res.status(429).json({
      ok: true,
      message: generic.message,
    });
  }

  const emailAddress = normalizeEmail(req.body.email);
  if (!isValidEmail(emailAddress)) {
    return jsonError(res, 400, "invalid_email", "Escribe un email válido.");
  }

  const stripe = stripeClient();
  if (!stripe) {
    return jsonError(
      res,
      503,
      "stripe_not_configured",
      "La consulta de membresías todavía no está conectada a Stripe.",
    );
  }

  try {
    const customers = await findCustomersByEmail(stripe, emailAddress);
    const matches = await subscriptionsForCustomers(stripe, customers);
    if (matches.length > 0) {
      const token = signToken({ typ: "access", email: emailAddress }, 15 * 60 * 1000);
      const accessUrl = `${publicUrl()}/membership?acceso=${encodeURIComponent(token)}`;
      email.sendAccessEmail({ to: emailAddress, accessUrl });

      if (process.env.NODE_ENV !== "production" && process.env.MEMBERSHIP_DEBUG_LINKS === "true") {
        return res.json({ ...generic, debugAccessUrl: accessUrl });
      }
    }
    res.json(generic);
  } catch (error) {
    console.error("[membership] access:", error);
    res.json(generic);
  }
});

app.post("/api/membership/verify", async (req, res) => {
  const token = String(req.body.token || req.query.token || "");
  const access = verifyToken(token);
  if (!access || access.typ !== "access") {
    return jsonError(res, 400, "expired", "El enlace caducó o no es válido. Solicita uno nuevo.");
  }

  const stripe = stripeClient();
  if (!stripe) return jsonError(res, 503, "stripe_not_configured", "Stripe no está configurado.");

  try {
    const customers = await findCustomersByEmail(stripe, access.email);
    if (!customers.length) {
      return jsonError(res, 404, "not_found", "No encontramos una membresía para este acceso.");
    }

    const sessionToken = signToken(
      { typ: "session", email: access.email, customerId: customers[0].id },
      24 * 60 * 60 * 1000,
    );
    res.setHeader("Set-Cookie", sessionCookie(sessionToken));
    res.json({ ok: true, email: access.email });
  } catch (error) {
    console.error("[membership] verify:", error);
    jsonError(res, 502, "verify_failed", "No se pudo verificar el acceso.");
  }
});

app.get("/api/membership/me", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const stripe = stripeClient();
  if (!stripe) return jsonError(res, 503, "stripe_not_configured", "Stripe no está configurado.");

  try {
    const customers = await findCustomersByEmail(stripe, session.email);
    const matches = await subscriptionsForCustomers(stripe, customers);
    const memberships = matches
      .map(({ customer, subscription }) => ({
        customerId: customer.id,
        email: customer.email || session.email,
        businessName: subscription.metadata?.businessName || customer.name || null,
        ...serializeSubscription(subscription),
      }))
      .sort((a, b) => String(b.currentPeriodEnd || "").localeCompare(String(a.currentPeriodEnd || "")));

    res.json({
      ok: true,
      email: session.email,
      memberships,
    });
  } catch (error) {
    console.error("[membership] me:", error);
    jsonError(res, 502, "lookup_failed", "No se pudo obtener la membresía desde Stripe.");
  }
});

app.post("/api/membership/portal", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  const stripe = stripeClient();
  if (!stripe) return jsonError(res, 503, "stripe_not_configured", "Stripe no está configurado.");

  try {
    let customerId = session.stripe_customer_id;
    const subscriptionId = String(req.body.subscriptionId || "");
    if (subscriptionId.startsWith("sub_")) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customers = await findCustomersByEmail(stripe, session.email);
      const allowed =
        subscription.customer === session.stripe_customer_id ||
        customers.some((customer) => customer.id === subscription.customer);
      if (!allowed) {
        return jsonError(res, 403, "forbidden", "No puedes gestionar una membresía que no te pertenece.");
      }
      customerId = subscription.customer;
    }

    const configuration = await portalConfiguration(stripe);
    const params = {
      customer: customerId,
      return_url: `${publicUrl()}/membership`,
    };
    if (configuration) params.configuration = configuration;
    const portal = await stripe.billingPortal.sessions.create(params);
    res.json({ ok: true, url: portal.url });
  } catch (error) {
    console.error("[membership] portal:", error);
    jsonError(res, 502, "portal_failed", "No se pudo abrir la gestión de la membresía.");
  }
});

app.post("/api/membership/cancel", async (req, res) => {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.body.confirm !== true) {
    return jsonError(res, 400, "confirm_required", "Confirma la cancelación para continuar.");
  }

  const stripe = stripeClient();
  if (!stripe) return jsonError(res, 503, "stripe_not_configured", "Stripe no está configurado.");

  const subscriptionId = String(req.body.subscriptionId || "");
  if (!subscriptionId.startsWith("sub_")) {
    return jsonError(res, 400, "invalid", "Membresía no válida.");
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.customer !== session.stripe_customer_id) {
      const customers = await findCustomersByEmail(stripe, session.email);
      const allowed = customers.some((customer) => customer.id === subscription.customer);
      if (!allowed) {
        return jsonError(res, 403, "forbidden", "No puedes cancelar una membresía que no te pertenece.");
      }
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    const periodEnd = formatDateFromUnix(periodEndUnix(updated));
    email.sendCancellationScheduled({
      to: session.email,
      currentPeriodEnd: periodEnd,
      planName: updated.metadata?.planName,
    });

    res.json({
      ok: true,
      membership: serializeSubscription(updated),
      message: periodEnd
        ? `Cancelación programada. Tu membresía continuará activa hasta ${periodEnd}. Después de esta fecha no se realizarán nuevas renovaciones.`
        : "Cancelación programada. Tu membresía continuará activa hasta finalizar el período ya pagado.",
    });
  } catch (error) {
    console.error("[membership] cancel:", error);
    jsonError(res, 502, "cancel_failed", "No se pudo programar la cancelación.");
  }
});

app.post("/api/membership/logout", async (_req, res) => {
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.json({ ok: true });
});

async function handleStripeEvent(stripe, event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const to = session.customer_details?.email || session.customer_email;
      if (to) {
        email.sendMembershipConfirmation({
          to,
          planId: session.metadata?.planId,
          termsVersion: session.metadata?.termsVersion,
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      break;
    }
    case "invoice.paid": {
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const to = invoice.customer_email;
      if (to) {
        email.sendPaymentIssue({
          to,
          invoiceId: invoice.id,
        });
      }
      break;
    }
    default:
      break;
  }
}

app.get("/membership", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "membership.html"));
});

app.use(express.static(path.join(ROOT, "public"), { dotfiles: "deny", index: "index.html" }));

module.exports = app;

if (require.main === module) {
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.SESSION_SECRET || "";
    if (!secret || secret === "reemplaza-este-secreto") {
      console.error("SESSION_SECRET es obligatorio en producción.");
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.info(`Publi con Jorge en ${publicUrl()}`);
    if (!isStripeConfigured()) {
      console.info("Stripe aún no está configurado. Completa las variables de entorno antes de cobrar membresías.");
    }
  });
}
