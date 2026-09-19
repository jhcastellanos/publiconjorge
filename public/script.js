const CONTACT_EMAIL = "inversionrealconjorge@gmail.com";
const LEADS_STORAGE_KEY = "publi-con-jorge-leads";
const SUPPORT_PHONE = "5612154451";
const SUPPORT_PHONE_DISPLAY = "561-215-4451";

const services = window.PUBLI_SERVICES || [];
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.getElementById("menu-movil");
const yearEl = document.getElementById("year");
const grid = document.getElementById("servicios-grid");
const serviceModal = document.getElementById("service-modal");
const serviceModalBody = document.getElementById("service-modal-body");
const leadModal = document.getElementById("lead-modal");
const leadForm = document.getElementById("lead-form");
const leadSuccess = document.getElementById("lead-success");
const leadFormView = document.getElementById("lead-form-view");
const statusEl = document.getElementById("form-status");
const serviceSelect = document.getElementById("servicio");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function supportCallMarkup(label, extraClass = "") {
  const cls = extraClass ? ` ${extraClass}` : "";
  return `<a class="btn btn-primary${cls}" href="tel:${SUPPORT_PHONE}">${escapeHtml(label || "Llamar para cotizar")}</a>`;
}

function serviceById(id) {
  return services.find((item) => item.id === id);
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

function listMarkup(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function bundleMarkup(bundle) {
  if (!bundle?.length) return "";
  return `<p class="bundle">${bundle.map((item) => `<span>${escapeHtml(item)}</span>`).join('<span class="bundle__plus">+</span>')}</p>`;
}

function renderCards() {
  if (!grid) return;
  grid.innerHTML = services
    .map(
      (service, index) => `
      <article class="spot service-card${service.featured ? " spot--featured service-card--complete" : ""}" data-service="${service.id}">
        <div class="service-card__top">
          <span class="service-card__icon">${iconFor(service.id)}</span>
          <p class="spot__num">0${index + 1}</p>
        </div>
        <p class="service-card__kicker">${escapeHtml(service.kicker)}</p>
        <h3>${escapeHtml(service.name)}</h3>
        ${
          service.id === "tira"
            ? `<div class="tira-mini" aria-hidden="true">
                <div class="phone-live phone-live--mini">
                  <div class="phone-live__chassis">
                    <div class="phone-live__screen">
                      <span class="phone-live__island"></span>
                      <img class="tira-demo__live" src="./live-frame.png" alt="" />
                      <div class="tira-mini__rail">
                        <div class="tira-demo__track">
                          <img src="./tira-banner.png?v=2" alt="" />
                          <img src="./tira-banner.png?v=2" alt="" />
                          <img src="./tira-banner.png?v=2" alt="" />
                          <img src="./tira-banner.png?v=2" alt="" />
                        </div>
                      </div>
                      <span class="phone-live__home"></span>
                    </div>
                  </div>
                </div>
              </div>`
            : service.id === "video"
              ? `<div class="tira-mini" aria-hidden="true">
                <div class="phone-live phone-live--mini">
                  <div class="phone-live__chassis">
                    <div class="phone-live__screen">
                      <span class="phone-live__island"></span>
                      <img class="video-demo__frame" src="./video-promo.png" alt="" />
                      <div class="video-demo__chrome">
                        <span class="video-demo__play"></span>
                        <span class="video-demo__progress"><span></span></span>
                      </div>
                      <span class="phone-live__home"></span>
                    </div>
                  </div>
                </div>
              </div>`
              : service.id === "landing"
              ? `<div class="tira-mini" aria-hidden="true">
                <div class="phone-live phone-live--mini">
                  <div class="phone-live__chassis">
                    <div class="phone-live__screen">
                      <span class="phone-live__island"></span>
                      <img class="landing-demo__frame" src="./landing-promo.png" alt="" />
                      <span class="phone-live__home"></span>
                    </div>
                  </div>
                </div>
              </div>`
              : ""
        }
        <p>${escapeHtml(service.shortDescription)}</p>
        ${bundleMarkup(service.bundle)}
        ${listMarkup(service.features)}
        <div class="service-card__actions">
          <button class="btn btn-ghost" type="button" data-open-detail="${service.id}">Ver más</button>
          ${
            service.customPricing
              ? supportCallMarkup(service.ctaLabel)
              : `<button class="btn btn-primary" type="button" data-open-lead="${service.id}">${escapeHtml(service.ctaLabel)}</button>`
          }
        </div>
      </article>
    `,
    )
    .join("");
}

function renderServiceOptions() {
  if (!serviceSelect) return;
  const current = serviceSelect.value;
  serviceSelect.innerHTML = `<option value="">Elige un espacio</option>${services
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)}</option>`)
    .join("")}`;
  if (current) serviceSelect.value = current;
}

function renderServiceDetail(service) {
  if (!serviceModalBody) return;
  serviceModalBody.innerHTML = `
    <p class="kicker">${escapeHtml(service.kicker)}</p>
    <h2 id="service-modal-title" tabindex="-1">${escapeHtml(service.name)}</h2>
    <p class="modal__intro">${escapeHtml(service.shortDescription)}</p>
    <h3>Cómo funciona</h3>
    ${listMarkup(service.howItWorks)}
    ${service.materials ? `<p class="modal__note">${escapeHtml(service.materials)}</p>` : ""}
    <h3>Qué incluye</h3>
    ${bundleMarkup(service.bundle)}
    ${listMarkup(service.includes)}
    ${
      service.customPricing
        ? `<p class="modal__note">Este paquete se cotiza por llamada con el equipo de soporte. Llama al ${escapeHtml(SUPPORT_PHONE_DISPLAY)}.</p>${supportCallMarkup(service.ctaLabel, "btn-full")}`
        : `<button class="btn btn-primary btn-full" type="button" data-open-lead="${service.id}">${escapeHtml(service.ctaLabel)}</button>`
    }
  `;
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  const panel = dialog.querySelector(".modal__panel");
  if (panel) panel.scrollTop = 0;
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function openServiceDetail(id) {
  const service = serviceById(id);
  if (!service) return;
  renderServiceDetail(service);
  openDialog(serviceModal);
}

function resetLeadForm() {
  leadForm?.reset();
  if (statusEl) {
    statusEl.textContent = "";
    statusEl.classList.remove("is-error");
  }
  leadFormView?.removeAttribute("hidden");
  leadSuccess?.setAttribute("hidden", "");
}

function openLeadForm(serviceId = "") {
  closeDialog(serviceModal);
  resetLeadForm();
  if (serviceSelect) serviceSelect.value = serviceId || "";
  openDialog(leadModal);
  const focusTarget = serviceId ? document.getElementById("nombre") : serviceSelect;
  focusTarget?.focus();
}

function closeLeadForm() {
  closeDialog(leadModal);
}

if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    mobileNav.hidden = open;
    mobileNav.classList.toggle("is-open", !open);
  });

  mobileNav.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      mobileNav.hidden = true;
      mobileNav.classList.remove("is-open");
    });
  });
}

document.addEventListener("click", (event) => {
  const detailBtn = event.target.closest("[data-open-detail]");
  if (detailBtn) {
    openServiceDetail(detailBtn.getAttribute("data-open-detail"));
    return;
  }

  const leadBtn = event.target.closest("[data-open-lead]");
  if (leadBtn) {
    openLeadForm(leadBtn.getAttribute("data-open-lead") || "");
    return;
  }

  if (event.target.closest("[data-close-modal]")) {
    closeDialog(event.target.closest("dialog"));
  }
});

[serviceModal, leadModal].forEach((dialog) => {
  dialog?.addEventListener("click", (event) => {
    const panel = dialog.querySelector(".modal__panel");
    if (panel && !panel.contains(event.target)) closeDialog(dialog);
  });
});

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function submitLead(payload) {
  // Punto único para conectar backend, CRM o email más adelante.
  const entry = {
    ...payload,
    createdAt: new Date().toISOString(),
    destination: CONTACT_EMAIL,
  };

  try {
    const stored = JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) || "[]");
    stored.push(entry);
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // El almacenamiento local es opcional; no bloquea el envío.
  }

  return { ok: true };
}

if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(leadForm);
    const payload = {
      nombre: String(data.get("nombre") || "").trim(),
      negocio: String(data.get("negocio") || "").trim(),
      telefono: String(data.get("telefono") || "").trim(),
      email: String(data.get("email") || "").trim(),
      servicioId: String(data.get("servicio") || "").trim(),
      mensaje: String(data.get("mensaje") || "").trim(),
    };
    const servicio = serviceById(payload.servicioId);

    if (!payload.nombre || !payload.telefono || !payload.servicioId) {
      setStatus("Completa nombre, teléfono y el servicio de interés.", true);
      return;
    }

    if (payload.email && !isValidEmail(payload.email)) {
      setStatus("Revisa el email o déjalo vacío.", true);
      return;
    }

    payload.servicio = servicio?.name || payload.servicioId;

    try {
      await submitLead(payload);
      leadFormView.setAttribute("hidden", "");
      leadSuccess?.removeAttribute("hidden");
      leadSuccess?.querySelector("h3")?.focus();
    } catch {
      setStatus("No se pudo enviar la solicitud. Inténtalo de nuevo.", true);
    }
  });
}

renderCards();
renderServiceOptions();
