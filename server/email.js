function hasEmailProvider() {
  return Boolean(process.env.EMAIL_PROVIDER);
}

function queueAndAttempt(template, to, payload) {
  if (!hasEmailProvider()) {
    console.info(`[email] Sin proveedor configurado. Plantilla ${template} para ${to}.`);
    if (payload.accessUrl) {
      console.info(`[email] Enlace de acceso (solo registro local): ${payload.accessUrl}`);
    }
    return { queued: true, sent: false };
  }

  console.info(`[email] Pendiente de proveedor. Plantilla ${template} para ${to}.`);
  return { queued: true, sent: false };
}

function sendAccessEmail({ to, accessUrl }) {
  return queueAndAttempt("membership_access", to, {
    subject: "Accede a tu membresía — Publi con Jorge",
    accessUrl,
  });
}

function sendMembershipConfirmation(payload) {
  return queueAndAttempt("membership_confirmation", payload.to, payload);
}

function sendCancellationScheduled(payload) {
  return queueAndAttempt("cancellation_scheduled", payload.to, payload);
}

function sendPaymentIssue(payload) {
  return queueAndAttempt("payment_failed", payload.to, payload);
}

module.exports = {
  hasEmailProvider,
  sendAccessEmail,
  sendMembershipConfirmation,
  sendCancellationScheduled,
  sendPaymentIssue,
};
