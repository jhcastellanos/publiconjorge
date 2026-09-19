const PUBLI_SERVICES = [
  {
    id: "tira",
    name: "Tira Publicitaria",
    kicker: "Presencia visual",
    shortDescription:
      "Mantén tu negocio visible durante nuestros LIVE mediante una presencia publicitaria visual y recurrente.",
    features: [
      "Pieza visual recurrente en el LIVE",
      "Rotación entre negocios",
      "Publicidad completamente silente",
    ],
    membershipFeatures: [
      "Tira publicitaria visual",
      "Aparición recurrente durante los LIVE",
      "Publicidad silente",
      "Información visual del negocio",
    ],
    howItWorks: [
      "Una pieza multimedia visual aparece de manera recurrente durante los LIVE.",
      "Los negocios de este espacio se muestran de forma rotativa, uno después del otro.",
      "La publicidad es completamente silente: el LIVE continúa con normalidad.",
      "El presentador no menciona el negocio, no detiene el LIVE, no explica productos ni hace una recomendación verbal.",
      "Es un espacio exclusivamente visual.",
    ],
    includes: ["Tira Publicitaria visual y recurrente durante los LIVE"],
    materials:
      "La pieza puede incluir logo, nombre, imágenes, información básica, producto o servicio principal, redes sociales, website, contacto y un call to action. El negocio proporciona los recursos. Lo que se muestre depende del diseño y del material entregado.",
    regularPrice: 500,
    promotionalPrice: 300,
    customPricing: false,
    billing: "monthly",
    stripePriceEnv: "STRIPE_PRICE_TIRA",
    ctaLabel: "Me interesa",
    membershipCtaLabel: "Seleccionar",
    featured: false,
  },
  {
    id: "video",
    name: "Video Publicitario",
    kicker: "Momento dedicado",
    shortDescription:
      "Dale a tu negocio un momento exclusivo dentro del LIVE con un video promocional creado específicamente para tu marca.",
    features: [
      "Video de 30 segundos a 1 minuto",
      "Voz grabada del presentador",
      "Incluye Tira Publicitaria",
    ],
    membershipFeatures: [
      "Video promocional de aproximadamente 30 segundos a 1 minuto",
      "Voz previamente grabada del presentador",
      "Espacio dedicado al negocio durante la reproducción",
      "Video una vez en cada LIVE correspondiente",
      "Tira Publicitaria incluida",
    ],
    howItWorks: [
      "Se crea un video promocional de aproximadamente 30 segundos a 1 minuto, dedicado a tu negocio.",
      "Incluye voz previamente grabada del presentador presentando o promocionando el negocio, producto o servicio.",
      "Durante la reproducción, el espacio queda completamente dedicado a esa empresa.",
      "El video aparece una vez en cada LIVE correspondiente al período contratado.",
      "Los materiales los proporciona el negocio y se adaptan al formato publicitario.",
    ],
    includes: [
      "Video promocional de aproximadamente 30 segundos a 1 minuto",
      "Voz previamente grabada del presentador",
      "Espacio dedicado al negocio durante la reproducción",
      "Aparición del video una vez en cada LIVE correspondiente",
      "Tira Publicitaria incluida durante los LIVE",
    ],
    bundle: ["Video promocional", "Tira Publicitaria"],
    materials:
      "El contenido puede incluir nombre, logo, imágenes, material audiovisual, productos, servicios, información relevante, datos de contacto, redes sociales, website y call to action.",
    regularPrice: 1000,
    promotionalPrice: 500,
    customPricing: false,
    billing: "monthly",
    stripePriceEnv: "STRIPE_PRICE_VIDEO",
    priceNote: "Los $500/mes corresponden al paquete completo, no solo a la creación del video.",
    ctaLabel: "Me interesa",
    membershipCtaLabel: "Seleccionar",
    featured: false,
  },
  {
    id: "landing",
    name: "Landing Page + Publicidad",
    kicker: "Paquete completo",
    shortDescription:
      "Combina presencia durante nuestros LIVE con un espacio digital propio donde tu audiencia pueda conocer mejor tu negocio.",
    features: [
      "Landing page básica para tu negocio",
      "Incluye Video Publicitario",
      "Incluye Tira Publicitaria",
    ],
    membershipFeatures: [
      "Landing Page básica",
      "Video Publicitario",
      "Tira Publicitaria",
    ],
    howItWorks: [
      "Se desarrolla una landing page básica dedicada al negocio: un sitio sencillo, profesional y accesible.",
      "El contenido y el alcance se definen según las necesidades del negocio y lo acordado.",
      "Puede incluir nombre, logo, presentación, productos, servicios, imágenes, información básica, contacto, redes sociales, call to action u otra información acordada.",
      "No hay una cantidad rígida de páginas o secciones.",
    ],
    includes: [
      "Landing page básica",
      "Video Publicitario de aproximadamente 30 segundos a 1 minuto",
      "Tira Publicitaria durante los LIVE",
    ],
    bundle: ["Landing page", "Video Publicitario", "Tira Publicitaria"],
    customPricing: true,
    customPricingLabel: "Cotización personalizada",
    customPricingNote:
      "El precio dependerá de las características del negocio, la información que necesite incluirse y los requerimientos específicos de la landing page.",
    billing: null,
    stripePriceEnv: null,
    ctaLabel: "Llamar para cotizar",
    membershipCtaLabel: "Llamar para cotizar",
    featured: true,
  },
  {
    id: "prueba",
    name: "Producto de prueba",
    kicker: "Solo prueba",
    shortDescription:
      "Plan técnico para verificar el pago de la membresía. No es un espacio publicitario.",
    features: [
      "Sirve para probar el flujo de PIN y Stripe Checkout",
      "No incluye Tira, Video ni Landing",
      "Se puede cancelar desde Membresía",
    ],
    membershipFeatures: [
      "Verificación del flujo de pago",
      "Renovación mensual de prueba",
      "Cancelación desde la sección Membresía",
    ],
    howItWorks: [
      "Este plan existe solo para probar el cobro mensual con Stripe.",
      "No reserva un espacio publicitario en los LIVE.",
      "Después del pago, la membresía se gestiona y se cancela desde esta misma sección.",
    ],
    includes: ["Cobro de prueba mediante Stripe Checkout"],
    materials: "",
    regularPrice: 5,
    promotionalPrice: 1,
    customPricing: false,
    billing: "monthly",
    stripePriceEnv: "STRIPE_PRICE_PRUEBA",
    priceNote: "Este plan es solo para pruebas de pago. No incluye un espacio publicitario.",
    ctaLabel: "Me interesa",
    membershipCtaLabel: "Seleccionar",
    featured: false,
    testOnly: true,
  },
];

if (typeof window !== "undefined") {
  window.PUBLI_SERVICES = PUBLI_SERVICES;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PUBLI_SERVICES };
}
