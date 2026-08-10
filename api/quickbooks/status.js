function getCookies(req) {
  const cookieHeader = req.headers.cookie || "";

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map(cookie => cookie.trim())
      .filter(Boolean)
      .map(cookie => {
        const index = cookie.indexOf("=");

        return [
          cookie.substring(0, index),
          decodeURIComponent(cookie.substring(index + 1))
        ];
      })
  );
}

export default async function handler(req, res) {
  const cookies = getCookies(req);

  res.status(200).json({
    connected: Boolean(cookies.qb_refresh && cookies.qb_realm),
    realmId: cookies.qb_realm || null
  });
}

