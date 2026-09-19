const app = require("../server/index.js");

function originalApiUrl(req) {
  const current = req.url || "/";
  const query = current.includes("?") ? current.slice(current.indexOf("?")) : "";
  const candidates = [
    req.headers["x-forwarded-uri"],
    req.headers["x-invoke-path"],
    req.originalUrl,
    current,
  ];

  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const pathOnly = value.split("?")[0];
    if (pathOnly === "/api" || pathOnly.startsWith("/api/")) {
      return pathOnly + (value.includes("?") ? value.slice(value.indexOf("?")) : query);
    }
  }

  if (current.split("?")[0].startsWith("/api")) return current;
  return "/api" + (current.startsWith("/") ? current : `/${current}`);
}

module.exports = (req, res) => {
  req.url = originalApiUrl(req);
  return app(req, res);
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
