const { queueEmail, updateEmailStatus } = require("./db");

function hasEmailProvider() {
  return Boolean(process.env.EMAIL_PROVIDER);
}

function queueAndAttempt(template, to, payload) {
  const id = queueEmail({
    to,
    template,
    payload,
    status: "pending",
  });

  if (!hasEmailProvider()) {
    updateEmailStatus(id, "skipped_no_provider");
    console.info(`[email] Sin proveedor configurado. Plantilla ${template} para ${to} queda en email_outbox.`);
    if (payload.accessUrl) {
      console.info(`[email] Enlace de acceso (solo registro local): ${payload.accessUrl}`);
    }
    return { queued: true, sent: false, id };
  }

  // Punto único para conectar SMTP, API transaccional u otro proveedor.
  // No se envía nada hasta que EMAIL_PROVIDER esté configurado.
  updateEmailStatus(id, "pending_provider");
  return { queued: true, sent: false, id };
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
