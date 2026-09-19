const app = document.getElementById("membership-app");
const appStatus = document.getElementById("app-status");
const termsModal = document.getElementById("terms-modal");
const termsBody = document.getElementById("terms-modal-body");
const cancelModal = document.getElementById("cancel-modal");
const cancelDateEl = document.getElementById("cancel-modal-date");
const cancelStatus = document.getElementById("cancel-status");
const confirmCancelBtn = document.getElementById("confirm-cancel");
const pinModal = document.getElementById("pin-modal");
const pinForm = document.getElementById("pin-form");
const pinInput = document.getElementById("sales-pin");
const pinStatus = document.getElementById("pin-status");
const pinHelp = document.getElementById("pin-help");
const pinSubmit = document.getElementById("pin-submit");
const SALES_PHONE = "5612154451";
const SALES_PHONE_DISPLAY = "561-215-4451";

const state = {
  config: null,
  view: "home",
  selectedPlanId: "",
  memberships: [],
  email: "",
  pendingCancelId: "",
  checkoutForm: {
    contactName: "",
    businessName: "",
    email: "",
    phone: "",
  },
  pendingCheckout: null,
};

function formatMoney(value) {
  return `$${Number(value).toLocaleString("en-US")}/mes`;
}

function formatDisplayDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es", { dateStyle: "long" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function iconFor(id) {
  if (id === "video") {
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="8" width="26" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 12.5v7l7-3.5-7-3.5z" fill="currentColor"/></svg>`;
  }
  if (id === "landing") {
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="6" width="24" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 11h24M8 16h10M8 20h7" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  }
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="7" width="24" height="6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="19" width="24" height="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 13v6M24 13v6" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

function setStatus(message, isError = false) {
  if (!appStatus) return;
  appStatus.textContent = message || "";
  appStatus.classList.toggle("is-error", Boolean(isError && message));
}

function salesPhoneDisplay() {
  return state.config?.salesTeamPhoneDisplay || SALES_PHONE_DISPLAY;
}

function salesPhoneHref() {
  return `tel:${state.config?.salesTeamPhone || SALES_PHONE}`;
}

function setPinStatus(message, isError = false, showSalesHelp = false) {
  if (!pinStatus) return;
  pinStatus.textContent = message;
  pinStatus.classList.toggle("is-error", isError);
  if (pinHelp) pinHelp.hidden = !showSalesHelp;
  if (pinHelp && showSalesHelp) {
    const phone = pinHelp.querySelector("a[href^='tel:']");
    if (phone) {
      phone.href = salesPhoneHref();
      phone.textContent = salesPhoneDisplay();
    }
  }
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || "No se pudo completar la solicitud.");
    error.code = data.error;
    throw error;
  }
  return data;
}

function priceMarkup(plan) {
  if (plan.customPricing) {
    return `
      <div class="price-block">
        <p class="price-block__label">Precio</p>
        <p class="price-block__custom">${escapeHtml(plan.customPricingLabel)}</p>
        <p class="price-block__note">${escapeHtml(plan.customPricingNote)}</p>
      </div>
    `;
  }

  return `
    <div class="price-block">
      <p class="price-block__label">Precio regular</p>
      <p class="price-block__regular"><s>${formatMoney(plan.regularPrice)}</s></p>
      <p class="price-block__promo-label">Precio promocional</p>
      <p class="price-block__promo">${formatMoney(plan.promotionalPrice)}</p>
      ${plan.priceNote ? `<p class="price-block__note">${escapeHtml(plan.priceNote)}</p>` : ""}
      <p class="renewal-note"><strong>Renovación automática mensual.</strong> Tu membresía se renovará automáticamente cada mes hasta que realices la cancelación desde la sección Membresía de este sitio.</p>
    </div>
  `;
}

function bundleMarkup(bundle) {
  if (!bundle?.length) return "";
  return `<p class="bundle">${bundle.map((item) => `<span>${escapeHtml(item)}</span>`).join('<span class="bundle__plus">+</span>')}</p>`;
}

function homeView() {
  return `
    <div class="choice-grid">
      <article class="spot choice-card">
        <p class="service-card__kicker">Ya soy cliente</p>
        <h2>Ya tengo una membresía</h2>
        <p>Verifica tu email para ver el plan, la próxima renovación y cancelar si lo necesitas.</p>
        <button class="btn btn-ghost btn-full" type="button" data-view="existing">Ya tengo una membresía</button>
      </article>
      <article class="spot choice-card choice-card--new">
        <p class="service-card__kicker">Nuevo</p>
        <h2>Quiero una membresía</h2>
        <p>Elige un espacio publicitario, acepta los términos y completa el pago mensual.</p>
        <button class="btn btn-primary btn-full" type="button" data-view="plans">Quiero una membresía</button>
      </article>
    </div>
  `;
}

function existingView() {
  return `
    <button class="text-back" type="button" data-view="home">← Volver</button>
    <header class="section-head">
      <p class="kicker">Acceso</p>
      <h2>Buscar mi membresía</h2>
      <p>El email por sí solo no basta para gestionar o cancelar. Te enviaremos un enlace de verificación.</p>
    </header>
    <form class="form membership-form" id="access-form">
      <div class="field">
        <label for="access-email">Email asociado a tu membresía</label>
        <input id="access-email" name="email" type="email" autocomplete="email" placeholder="tuemail@ejemplo.com" required />
      </div>
      <button class="btn btn-primary btn-full" type="submit">Buscar mi membresía</button>
    </form>
  `;
}

function sentLinkView() {
  return `
    <button class="text-back" type="button" data-view="existing">← Volver</button>
    <header class="section-head">
      <p class="kicker">Verificación</p>
      <h2>Revisa tu email</h2>
      <p>Si existe una membresía con ese correo, te enviaremos un enlace para verificar tu identidad y acceder.</p>
    </header>
  `;
}

function plansView() {
  const plans = state.config?.plans || window.PUBLI_SERVICES || [];
  return `
    <button class="text-back" type="button" data-view="home">← Volver</button>
    <header class="section-head">
      <p class="kicker">Planes</p>
      <h2>Elige tu espacio publicitario</h2>
    </header>
    <aside class="notice-block notice-block--soft" role="note">
      <p class="notice-block__label">Renovación y cancelación</p>
      <p>
        Los planes mensuales se renuevan automáticamente. Si decides dejar de utilizar el servicio,
        debes cancelar tu membresía desde esta misma sección antes de la siguiente renovación.
        Mientras la membresía permanezca activa, el servicio continuará y Stripe procesará las
        renovaciones correspondientes. La falta de cancelación por parte del cliente no genera
        automáticamente derecho a reembolso.
      </p>
      <p><button class="text-link" type="button" data-open-terms>Ver política completa</button></p>
    </aside>
    <div class="services membership-plans">
      ${plans
        .map(
          (plan, index) => `
        <article class="spot service-card${plan.featured ? " spot--featured service-card--complete" : ""}">
          <div class="service-card__top">
            <span class="service-card__icon">${iconFor(plan.id)}</span>
            <p class="spot__num">0${index + 1}</p>
          </div>
          <p class="service-card__kicker">${escapeHtml(plan.kicker)}</p>
          <h3>${escapeHtml(plan.name)}</h3>
          <p>${escapeHtml(plan.shortDescription)}</p>
          ${bundleMarkup(plan.bundle)}
          <ul>${(plan.membershipFeatures || plan.features || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          ${priceMarkup(plan)}
          ${
            plan.customPricing
              ? `<button class="btn btn-primary" type="button" data-open-lead="${plan.id}">${escapeHtml(plan.membershipCtaLabel || "Solicitar cotización")}</button>`
              : `<button class="btn btn-primary" type="button" data-select-plan="${plan.id}">${escapeHtml(plan.membershipCtaLabel || "Seleccionar")}</button>`
          }
        </article>
      `,
        )
        .join("")}
    </div>
  `;
}

function checkoutView() {
  const plan = (state.config?.plans || []).find((item) => item.id === state.selectedPlanId);
  if (!plan) {
    return `<p>Selecciona un plan para continuar.</p><button class="btn btn-ghost" type="button" data-view="plans">Ver planes</button>`;
  }
  const form = state.checkoutForm;
  return `
    <button class="text-back" type="button" data-view="plans">← Cambiar plan</button>
    <header class="section-head">
      <p class="kicker">Contratación</p>
      <h2>Completa tus datos</h2>
      <p>Después de aceptar los términos, verificarás el PIN y continuarás al pago seguro de Stripe.</p>
    </header>
    <div class="checkout-layout">
      <aside class="spot checkout-summary">
        <p class="service-card__kicker">Plan seleccionado</p>
        <h3>${escapeHtml(plan.name)}</h3>
        ${priceMarkup(plan)}
      </aside>
      <form class="form membership-form" id="checkout-form">
        <div class="field">
          <label for="contactName">Nombre de contacto *</label>
          <input id="contactName" name="contactName" type="text" autocomplete="name" required value="${escapeHtml(form.contactName)}" />
        </div>
        <div class="field">
          <label for="businessName">Nombre del negocio *</label>
          <input id="businessName" name="businessName" type="text" autocomplete="organization" required value="${escapeHtml(form.businessName)}" />
        </div>
        <div class="field">
          <label for="checkout-email">Email *</label>
          <input id="checkout-email" name="email" type="email" autocomplete="email" required value="${escapeHtml(form.email)}" />
        </div>
        <div class="field">
          <label for="checkout-phone">Número de teléfono *</label>
          <input id="checkout-phone" name="phone" type="tel" autocomplete="tel" required value="${escapeHtml(form.phone)}" />
        </div>
        <div class="field">
          <label for="selectedPlan">Plan seleccionado *</label>
          <select id="selectedPlan" name="planId" required>
            ${(state.config?.plans || [])
              .filter((item) => !item.customPricing)
              .map(
                (item) =>
                  `<option value="${item.id}" ${item.id === plan.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`,
              )
              .join("")}
          </select>
        </div>
        <aside class="notice-block" role="note">
          <p class="notice-block__label">Importante sobre la cancelación</p>
          <p>Las membresías se renuevan automáticamente. Debes cancelar desde esta sección si ya no deseas continuar. La falta de cancelación no da derecho automático a reembolso.</p>
          <p>
            <button class="text-link" type="button" data-open-terms>Leer Términos y Condiciones</button>
            ·
            <a href="/api/terms/pdf?plan=${encodeURIComponent(plan.id)}">Descargar PDF</a>
          </p>
        </aside>
        <div class="field field--check">
          <label>
            <input id="termsAccepted" name="termsAccepted" type="checkbox" required />
            He leído y acepto los Términos y Condiciones, incluyendo las condiciones de renovación automática, cancelación y reembolsos.
          </label>
        </div>
        <button class="btn btn-primary btn-full" type="submit">Continuar al pago</button>
      </form>
    </div>
  `;
}

function accountView() {
  if (!state.memberships.length) {
    return `
      <button class="text-back" type="button" data-view="home">← Volver</button>
      <header class="section-head">
        <p class="kicker">Tu cuenta</p>
        <h2>No hay membresías para mostrar</h2>
        <p>Verifica otro email o contrata un plan.</p>
      </header>
    `;
  }

  return `
    <button class="text-back" type="button" data-view="home">← Volver</button>
    <header class="section-head">
      <p class="kicker">${escapeHtml(state.email || "Membresía")}</p>
      <h2>Tu membresía</h2>
    </header>
    <div class="membership-list">
      ${state.memberships
        .map((item) => {
          const end = formatDisplayDate(item.currentPeriodEnd);
          return `
            <article class="spot membership-card">
              <p class="status-pill status-pill--${escapeHtml(item.statusKey)}">${escapeHtml(item.status)}</p>
              <p class="service-card__kicker">Plan</p>
              <h3>${escapeHtml(item.planName)}</h3>
              <dl class="membership-meta">
                ${item.priceLabel ? `<div><dt>Precio</dt><dd>${escapeHtml(item.priceLabel)}</dd></div>` : ""}
                <div><dt>Estado</dt><dd>${escapeHtml(item.status)}</dd></div>
                ${
                  item.cancelAtPeriodEnd && end
                    ? `<div><dt>Activa hasta</dt><dd>${escapeHtml(end)}</dd></div>`
                    : end
                      ? `<div><dt>Próxima renovación</dt><dd>${escapeHtml(end)}</dd></div>`
                      : ""
                }
              </dl>
              ${
                item.cancelAtPeriodEnd && end
                  ? `<p>Tu membresía continuará activa hasta ${escapeHtml(end)}. Después de esta fecha no se realizarán nuevas renovaciones.</p>`
                  : ""
              }
              <div class="membership-actions">
                <button class="btn btn-primary" type="button" data-portal="${escapeHtml(item.id)}">Gestionar membresía</button>
                ${
                  item.statusKey === "canceled" || item.statusKey === "cancel_at_period_end"
                    ? ""
                    : `<button class="btn btn-danger" type="button" data-cancel="${escapeHtml(item.id)}" data-period-end="${escapeHtml(item.currentPeriodEnd || "")}">Cancelar membresía</button>`
                }
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
    <p class="membership-footnote">
      <button class="text-link" type="button" data-open-terms>Términos y Condiciones</button>
      ·
      <a href="/api/terms/pdf">Descargar PDF</a>
      ·
      <button class="text-link" type="button" id="logout-btn">Cerrar sesión</button>
    </p>
  `;
}

function successView(payload) {
  const membership = payload?.membership;
  const end = formatDisplayDate(membership?.currentPeriodEnd);
  return `
    <header class="section-head">
      <p class="kicker">Confirmación</p>
      <h2>¡Bienvenido!</h2>
      <p>Tu membresía publicitaria ha sido creada correctamente.</p>
    </header>
    <article class="spot membership-card">
      ${membership ? `<p class="status-pill">${escapeHtml(membership.status)}</p>` : ""}
      <dl class="membership-meta">
        ${membership?.planName ? `<div><dt>Plan contratado</dt><dd>${escapeHtml(membership.planName)}</dd></div>` : ""}
        ${membership?.priceLabel ? `<div><dt>Precio mensual</dt><dd>${escapeHtml(membership.priceLabel)}</dd></div>` : ""}
        ${payload?.email ? `<div><dt>Email</dt><dd>${escapeHtml(payload.email)}</dd></div>` : ""}
        ${membership?.status ? `<div><dt>Estado</dt><dd>${escapeHtml(membership.status)}</dd></div>` : ""}
        ${end ? `<div><dt>Próxima renovación</dt><dd>${escapeHtml(end)}</dd></div>` : ""}
      </dl>
    </article>
    <div class="membership-actions">
      <button class="btn btn-primary" type="button" data-view="account">Gestionar mi membresía</button>
      <button class="btn btn-ghost" type="button" data-open-terms>Términos y Condiciones</button>
      <a class="btn btn-ghost" href="/api/terms/pdf${membership?.planId ? `?plan=${encodeURIComponent(membership.planId)}` : ""}">Descargar PDF</a>
    </div>
  `;
}

function render() {
  if (!app) return;
  const views = {
    home: homeView,
    existing: existingView,
    sent: sentLinkView,
    plans: plansView,
    checkout: checkoutView,
    account: accountView,
    success: () => successView(state.successPayload),
  };
  app.querySelectorAll("[data-bind]").forEach(() => {});
  const current = views[state.view] || homeView;
  const statusHtml = appStatus ? "" : "";
  const host = app.querySelector(".membership-view") || document.createElement("div");
  host.className = "membership-view";
  host.innerHTML = current();
  if (!host.parentNode) {
    app.appendChild(host);
  }
  void statusHtml;
}

function showView(name) {
  state.view = name;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadConfig() {
  try {
    state.config = await api("/api/config");
  } catch {
    state.config = {
      termsVersion: "1.0",
      stripeConfigured: false,
      plans: (window.PUBLI_SERVICES || []).map((plan) => ({
        ...plan,
        stripeReady: false,
      })),
    };
    setStatus("El servidor de membresías no está disponible todavía.", true);
  }
}

async function openTerms(planId = "") {
  try {
    const data = await api(`/api/terms${planId ? `?plan=${encodeURIComponent(planId)}` : ""}`);
    const terms = data.terms;
    termsBody.innerHTML = `
      <p class="kicker">${escapeHtml(terms.brand)} · Versión ${escapeHtml(terms.version)}</p>
      <h2 id="terms-modal-title">${escapeHtml(terms.title)}</h2>
      <p class="modal__intro">${escapeHtml(terms.intro)}</p>
      <aside class="notice-block">
        <p class="notice-block__label">${escapeHtml(terms.cancellationNotice.title)}</p>
        ${terms.cancellationNotice.paragraphs.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      </aside>
      ${terms.sections
        .map(
          (section) => `
        <h3>${section.number}. ${escapeHtml(section.title)}</h3>
        ${section.paragraphs.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      `,
        )
        .join("")}
      <a class="btn btn-ghost btn-full" href="/api/terms/pdf${planId ? `?plan=${encodeURIComponent(planId)}` : ""}">Descargar PDF</a>
    `;
    openDialog(termsModal);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function submitAccess(event) {
  event.preventDefault();
  const email = String(new FormData(event.target).get("email") || "").trim();
  try {
    const data = await api("/api/membership/access", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    showView("sent");
    if (data.debugAccessUrl) {
      setStatus(`Modo técnico: ${data.debugAccessUrl}`);
    } else {
      setStatus(data.message);
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function submitCheckout(event) {
  event.preventDefault();
  const form = event.target;
  const payload = {
    contactName: String(form.contactName.value || "").trim(),
    businessName: String(form.businessName.value || "").trim(),
    email: String(form.email.value || "").trim(),
    phone: String(form.phone.value || "").trim(),
    planId: String(form.planId.value || "").trim(),
    termsAccepted: Boolean(form.termsAccepted.checked),
    termsVersion: state.config?.termsVersion,
  };
  state.checkoutForm = payload;
  state.selectedPlanId = payload.planId;

  if (!payload.termsAccepted) {
    setStatus("Debes aceptar los Términos y Condiciones para continuar al pago.", true);
    return;
  }

  state.pendingCheckout = payload;
  if (pinForm) pinForm.reset();
  setPinStatus("");
  openDialog(pinModal);
  pinInput?.focus();
}

async function submitPin(event) {
  event.preventDefault();
  const payload = state.pendingCheckout;
  if (!payload) {
    setPinStatus("Completa tus datos antes de continuar al pago.", true);
    return;
  }
  const salesPin = String(pinInput?.value || "").trim();
  if (!/^\d{4}$/.test(salesPin)) {
    setPinStatus("Ingresa el PIN de 4 dígitos que te proporcionó el equipo de soporte.", true);
    return;
  }

  if (pinSubmit) pinSubmit.disabled = true;
  try {
    const data = await api("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ ...payload, salesPin }),
    });
    window.location.href = data.url;
  } catch (error) {
    setPinStatus(error.message, true, error.code === "pin_invalid" || error.code === "pin_locked");
  } finally {
    if (pinSubmit) pinSubmit.disabled = false;
  }
}

async function loadAccount() {
  try {
    const data = await api("/api/membership/me");
    state.email = data.email;
    state.memberships = data.memberships || [];
    showView("account");
    setStatus("");
    return true;
  } catch {
    return false;
  }
}

async function verifyAccess(token) {
  try {
    await api("/api/membership/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    await loadAccount();
  } catch (error) {
    showView("existing");
    setStatus(error.message, true);
  }
}

async function loadSuccess(sessionId) {
  try {
    const data = await api(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
    state.successPayload = data;
    if (data.membership) {
      state.memberships = [data.membership];
      state.email = data.email;
    }
    showView("success");
  } catch (error) {
    showView("home");
    setStatus(error.message, true);
  }
}

async function openPortal(subscriptionId) {
  try {
    const data = await api("/api/membership/portal", {
      method: "POST",
      body: JSON.stringify({ subscriptionId: subscriptionId || "" }),
    });
    window.location.href = data.url;
  } catch (error) {
    setStatus(error.message, true);
  }
}

function askCancel(subscriptionId, periodEnd) {
  state.pendingCancelId = subscriptionId;
  const end = formatDisplayDate(periodEnd);
  cancelDateEl.textContent = end
    ? `La fecha efectiva de finalización la confirma Stripe. Según los datos actuales, el período pagado termina el ${end}.`
    : "La fecha efectiva de finalización la confirma Stripe al procesar la cancelación.";
  cancelStatus.textContent = "";
  openDialog(cancelModal);
}

async function confirmCancel() {
  if (!state.pendingCancelId) return;
  confirmCancelBtn.disabled = true;
  try {
    const data = await api("/api/membership/cancel", {
      method: "POST",
      body: JSON.stringify({ confirm: true, subscriptionId: state.pendingCancelId }),
    });
    closeDialog(cancelModal);
    await loadAccount();
    setStatus(data.message);
  } catch (error) {
    cancelStatus.textContent = error.message;
    cancelStatus.classList.add("is-error");
  } finally {
    confirmCancelBtn.disabled = false;
  }
}

app?.addEventListener("click", (event) => {
  const viewBtn = event.target.closest("[data-view]");
  if (viewBtn) {
    setStatus("");
    showView(viewBtn.getAttribute("data-view"));
    return;
  }
  const planBtn = event.target.closest("[data-select-plan]");
  if (planBtn) {
    state.selectedPlanId = planBtn.getAttribute("data-select-plan");
    setStatus("");
    showView("checkout");
  }
  const portalBtn = event.target.closest("[data-portal]");
  if (portalBtn) {
    openPortal(portalBtn.getAttribute("data-portal"));
    return;
  }
  const cancelBtn = event.target.closest("[data-cancel]");
  if (cancelBtn) {
    askCancel(cancelBtn.getAttribute("data-cancel"), cancelBtn.getAttribute("data-period-end"));
  }
  if (event.target.closest("#logout-btn")) {
    api("/api/membership/logout", { method: "POST", body: "{}" }).finally(() => {
      state.memberships = [];
      state.email = "";
      showView("home");
    });
  }
});

app?.addEventListener("submit", (event) => {
  if (event.target.id === "access-form") submitAccess(event);
  if (event.target.id === "checkout-form") submitCheckout(event);
});

app?.addEventListener("change", (event) => {
  if (event.target.id === "selectedPlan") {
    state.selectedPlanId = event.target.value;
    const form = event.target.form;
    if (form) {
      state.checkoutForm = {
        contactName: form.contactName.value,
        businessName: form.businessName.value,
        email: form.email.value,
        phone: form.phone.value,
      };
    }
    render();
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-terms]")) {
    event.preventDefault();
    openTerms(state.selectedPlanId);
  }
});

confirmCancelBtn?.addEventListener("click", confirmCancel);
pinForm?.addEventListener("submit", submitPin);
pinInput?.addEventListener("input", () => {
  pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
});

[termsModal, cancelModal, pinModal].forEach((dialog) => {
  dialog?.addEventListener("click", (event) => {
    const panel = dialog.querySelector(".modal__panel");
    if (panel && !panel.contains(event.target)) closeDialog(dialog);
  });
});

async function boot() {
  showView("home");
  await loadConfig();
  const params = new URLSearchParams(window.location.search);
  const access = params.get("acceso");
  const sessionId = params.get("session_id");
  const status = params.get("status");

  try {
    if (access) {
      await verifyAccess(access);
      return;
    }
    if (status === "success" && sessionId) {
      await loadSuccess(sessionId);
      return;
    }
    if (status === "cancelled") {
      showView("plans");
      setStatus("El pago no se completó. Puedes elegir el plan de nuevo cuando quieras.");
      return;
    }
    const hasSession = await loadAccount();
    if (!hasSession && state.view === "home") {
      showView("home");
    }
  } catch (error) {
    showView("home");
    setStatus(error.message || "No se pudo cargar la membresía.", true);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
