const crypto = require("crypto");
const { PUBLI_SERVICES } = require("../public/services");
const { TERMS_VERSION } = require("./terms");

function publicUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || "";
  if (!secret || secret === "reemplaza-este-secreto") return "";
  return secret;
}

function signToken(payload, ttlMs) {
  const secret = sessionSecret() || "dev-only-session-secret";
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  const secret = sessionSecret() || (process.env.VERCEL ? "" : "dev-only-session-secret");
  if (!secret) return null;
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function isStripeConfigured() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key || key.includes("reemplaza")) return false;
  return key.startsWith("sk_") || key.startsWith("rk_");
}

function stripePriceId(plan) {
  if (!plan?.stripePriceEnv) return null;
  const value = String(process.env[plan.stripePriceEnv] || "").trim();
  if (!value || value.includes("reemplaza") || value.startsWith("price_placeholder")) return null;
  if (!value.startsWith("price_")) return null;
  return value;
}

function getPlan(id) {
  return PUBLI_SERVICES.find((item) => item.id === id) || null;
}

function planFromPriceId(priceId) {
  if (!priceId) return null;
  return PUBLI_SERVICES.find((item) => stripePriceId(item) === priceId) || null;
}

function publicPlans({ includePrices = false } = {}) {
  return PUBLI_SERVICES.map((plan) => {
    const item = {
      id: plan.id,
      name: plan.name,
      kicker: plan.kicker,
      shortDescription: plan.shortDescription,
      membershipFeatures: plan.membershipFeatures || plan.features,
      bundle: plan.bundle || [],
      customPricing: Boolean(plan.customPricing),
      billing: plan.billing,
      membershipCtaLabel: plan.membershipCtaLabel,
      featured: Boolean(plan.featured),
      stripeReady: Boolean(stripePriceId(plan)),
    };
    if (includePrices && !plan.customPricing) {
      item.regularPrice = plan.regularPrice ?? null;
      item.promotionalPrice = plan.promotionalPrice ?? null;
      item.priceNote = plan.priceNote || null;
    }
    return item;
  });
}

const SALES_TEAM_PHONE = "5612154451";
const SALES_TEAM_PHONE_DISPLAY = "561-215-4451";

function salesPinExpected() {
  return String(process.env.CHECKOUT_SALES_PIN || "0402").trim();
}

function salesPinMatches(value) {
  const expected = salesPinExpected();
  const given = String(value || "").replace(/\D/g, "");
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (!expected || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function salesPinErrorMessage() {
  return `El PIN no es correcto. Contacta al equipo de soporte al ${SALES_TEAM_PHONE_DISPLAY} para que te lo proporcionen.`;
}

function publicConfig() {
  return {
    termsVersion: TERMS_VERSION,
    stripeConfigured: isStripeConfigured(),
    debugLinks: process.env.NODE_ENV !== "production" && process.env.MEMBERSHIP_DEBUG_LINKS === "true",
    salesTeamPhone: SALES_TEAM_PHONE,
    salesTeamPhoneDisplay: SALES_TEAM_PHONE_DISPLAY,
    plans: publicPlans(),
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function cookieSecure() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function sessionCookie(token, maxAgeSeconds = 60 * 60 * 24) {
  const secure = cookieSecure() ? "; Secure" : "";
  return `membership_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function clearSessionCookie() {
  const secure = cookieSecure() ? "; Secure" : "";
  return `membership_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function periodEndUnix(subscription) {
  return (
    subscription?.current_period_end ||
    subscription?.items?.data?.[0]?.current_period_end ||
    subscription?.cancel_at ||
    null
  );
}

function formatDateFromUnix(unix) {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

function statusLabel(subscription) {
  if (!subscription) return { key: "unknown", label: "Sin información" };
  if (subscription.cancel_at_period_end && (subscription.status === "active" || subscription.status === "trialing")) {
    return { key: "cancel_at_period_end", label: "Cancelación programada" };
  }
  const labels = {
    active: "Activa",
    canceled: "Cancelada",
    past_due: "Pago pendiente",
    unpaid: "Pago fallido",
    incomplete: "Pago pendiente",
    incomplete_expired: "Incompleta",
    paused: "Pausada",
    trialing: "En prueba",
  };
  return {
    key: subscription.status,
    label: labels[subscription.status] || subscription.status,
  };
}

function formatMoneyFromStripe(amount, currency) {
  if (amount == null) return null;
  const value = amount / 100;
  const formatted = value.toLocaleString("en-US");
  if ((currency || "usd").toLowerCase() === "usd") return `$${formatted}/mes`;
  return `${formatted} ${(currency || "").toUpperCase()}/mes`;
}

module.exports = {
  PUBLI_SERVICES,
  publicUrl,
  sessionSecret,
  signToken,
  verifyToken,
  isStripeConfigured,
  stripePriceId,
  getPlan,
  planFromPriceId,
  publicPlans,
  publicConfig,
  salesPinMatches,
  salesPinErrorMessage,
  SALES_TEAM_PHONE,
  SALES_TEAM_PHONE_DISPLAY,
  hashToken,
  randomToken,
  parseCookies,
  sessionCookie,
  clearSessionCookie,
  periodEndUnix,
  formatDateFromUnix,
  statusLabel,
  formatMoneyFromStripe,
};
