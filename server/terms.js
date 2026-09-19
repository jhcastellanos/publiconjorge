const TERMS_VERSION = "1.0";

const TERMS_TITLE = "Términos y Condiciones";
const TERMS_BRAND = "Publi con Jorge";

const TERMS_INTRO =
  "Estos términos describen las condiciones aplicables a las membresías publicitarias contratadas a través de este sitio. La versión vigente al momento de la contratación es la que queda registrada junto a la membresía.";

const TERMS_SECTIONS = [
  {
    number: 1,
    title: "Objeto del servicio",
    paragraphs: [
      "Publi con Jorge ofrece espacios publicitarios para empresas, marcas, profesionales y negocios interesados en promocionarse durante los LIVE de TikTok y el ecosistema de contenido digital asociado.",
      "El servicio publicitario concreto depende del plan contratado: Tira Publicitaria, Video Publicitario, o Landing Page + Publicidad cuando este último se contrate tras una cotización.",
    ],
  },
  {
    number: 2,
    title: "Plan contratado",
    paragraphs: [
      "El plan contratado es el seleccionado por el cliente al momento de la contratación y queda identificado en la membresía correspondiente.",
      "Cada plan incluye únicamente los elementos descritos para esa opción en el sitio al contratar. No se incluyen características adicionales que no hayan sido indicadas.",
    ],
  },
  {
    number: 3,
    title: "Facturación",
    paragraphs: [
      "Las membresías con precio definido utilizan facturación recurrente mensual mediante Stripe.",
      "El cobro se procesa a través de la infraestructura de pago de Stripe. Publi con Jorge no almacena números completos de tarjeta ni códigos de seguridad.",
      "Landing Page + Publicidad no tiene un precio fijo publicado. Su contratación económica se define mediante cotización y, cuando corresponda, podrá incorporarse después al sistema de membresías.",
    ],
  },
  {
    number: 4,
    title: "Renovación automática",
    paragraphs: [
      "La membresía se renovará automáticamente cada mes mientras permanezca activa.",
      "Mientras la membresía permanezca activa y los pagos continúen procesándose, el servicio publicitario continuará según el plan contratado.",
    ],
  },
  {
    number: 5,
    title: "Cancelación",
    paragraphs: [
      "El cliente es responsable de realizar la cancelación utilizando la sección Membresía de este sitio web.",
      "La cancelación debe realizarse mediante el mecanismo disponible en el sitio y procesarse correctamente.",
      "Es responsabilidad del negocio cancelar su membresía desde la sección Membresía cuando desee finalizar el servicio.",
    ],
  },
  {
    number: 6,
    title: "Efecto de la cancelación",
    paragraphs: [
      "La cancelación evita futuras renovaciones. No se debe realizar otro cobro después de finalizar el período ya pagado.",
      "El servicio publicitario continuará activo hasta finalizar el período de facturación ya pagado.",
      "Una vez finalizado ese período, la membresía dejará de renovarse y el servicio publicitario finalizará.",
    ],
  },
  {
    number: 7,
    title: "Responsabilidad del cliente",
    paragraphs: [
      "El cliente es responsable de gestionar correctamente la cancelación de su membresía cuando ya no desee continuar con el servicio.",
      "La falta de cancelación por parte del cliente no dará derecho automáticamente a reembolso.",
    ],
  },
  {
    number: 8,
    title: "Cancelaciones manuales",
    paragraphs: [
      "Publi con Jorge no asume la obligación de procesar cancelaciones mediante mensajes informales, redes sociales u otros canales externos cuando existe un mecanismo de cancelación disponible dentro del sitio.",
      "Publi con Jorge no realiza cancelaciones manuales por solicitud informal y no se responsabiliza por renovaciones producidas porque el cliente no haya completado correctamente el proceso de cancelación.",
    ],
  },
  {
    number: 9,
    title: "Reembolsos",
    paragraphs: [
      "La falta de cancelación de una membresía por parte del cliente no genera automáticamente derecho a reembolso por una renovación correctamente procesada mientras la suscripción permanecía activa.",
    ],
  },
  {
    number: 10,
    title: "Continuidad del servicio",
    paragraphs: [
      "Mientras la membresía permanezca activa y los pagos correspondientes continúen procesándose, el servicio publicitario continuará según el plan contratado.",
      "Publi con Jorge mantendrá la publicidad activa durante el período pagado, sujeto a estos términos.",
    ],
  },
  {
    number: 11,
    title: "Materiales publicitarios",
    paragraphs: [
      "El negocio deberá proporcionar los logos, imágenes, información y demás recursos necesarios para preparar la publicidad.",
      "La información exacta mostrada depende del diseño, del plan contratado y del material proporcionado por el negocio.",
      "El negocio declara tener derechos para utilizar los logos, fotografías, videos y demás contenido que entregue.",
    ],
  },
  {
    number: 12,
    title: "Responsabilidades de Publi con Jorge",
    paragraphs: [
      "Proporcionar el servicio publicitario correspondiente al plan contratado.",
      "Mantener la publicidad activa durante el período pagado, sujeto a estos términos.",
      "Proporcionar los elementos incluidos en el plan contratado.",
      "Procesar la membresía mediante la infraestructura de pago implementada.",
    ],
  },
  {
    number: 13,
    title: "Responsabilidades del negocio",
    paragraphs: [
      "Proporcionar información correcta.",
      "Proporcionar los materiales necesarios para producir la publicidad.",
      "Tener derechos para utilizar logos, fotografías, videos y demás contenido entregado.",
      "Mantener información de contacto válida.",
      "Mantener el método de pago correspondiente.",
      "Gestionar su membresía.",
      "Realizar la cancelación cuando no desee continuar.",
      "Revisar y aceptar los términos correspondientes a la versión vigente al momento de la contratación.",
    ],
  },
  {
    number: 14,
    title: "Duración",
    paragraphs: [
      "La duración dependerá de los períodos de facturación correspondientes y continuará mientras la membresía permanezca activa.",
    ],
  },
  {
    number: 15,
    title: "Aceptación",
    paragraphs: [
      "La contratación y la aceptación electrónica de estos términos constituyen la aceptación de las condiciones correspondientes a la versión vigente al momento de la contratación.",
      "Queda registrado el email del cliente, la versión de los términos aceptada y la fecha y hora de la aceptación.",
    ],
  },
];

const CANCELLATION_NOTICE = {
  title: "Importante sobre la cancelación",
  paragraphs: [
    "Las membresías se renuevan automáticamente mientras permanezcan activas. Si deseas finalizar tu servicio, es responsabilidad del negocio cancelar su membresía desde la sección Membresía de este sitio web.",
    "Publi con Jorge no realiza cancelaciones manuales por solicitud informal y no se responsabiliza por renovaciones producidas porque el cliente no haya completado correctamente el proceso de cancelación.",
    "Mientras la membresía permanezca activa y los pagos continúen procesándose, el servicio publicitario continuará activo.",
    "La falta de cancelación por parte del cliente no dará derecho automáticamente a reembolso.",
  ],
};

const RENEWAL_NOTICE = {
  title: "Renovación y cancelación",
  paragraphs: [
    "Los planes mensuales se renuevan automáticamente. Si decides dejar de utilizar el servicio, debes cancelar tu membresía desde esta misma sección antes de la siguiente renovación. Mientras la membresía permanezca activa, el servicio continuará y Stripe procesará las renovaciones correspondientes. La falta de cancelación por parte del cliente no genera automáticamente derecho a reembolso.",
  ],
};

function getTerms(planName = "") {
  const sections = TERMS_SECTIONS.map((section) => {
    if (section.number !== 2 || !planName) return section;
    return {
      ...section,
      paragraphs: [
        `Plan identificado: ${planName}.`,
        ...section.paragraphs,
      ],
    };
  });

  return {
    version: TERMS_VERSION,
    title: TERMS_TITLE,
    brand: TERMS_BRAND,
    intro: TERMS_INTRO,
    sections,
    cancellationNotice: CANCELLATION_NOTICE,
    renewalNotice: RENEWAL_NOTICE,
  };
}

module.exports = {
  TERMS_VERSION,
  TERMS_TITLE,
  TERMS_BRAND,
  TERMS_INTRO,
  TERMS_SECTIONS,
  CANCELLATION_NOTICE,
  RENEWAL_NOTICE,
  getTerms,
};
