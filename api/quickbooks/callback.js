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
  try {
    const { code, realmId, state } = req.query;

    const cookies = getCookies(req);

    if (!state || state !== cookies.qb_oauth_state) {
      return res.status(400).send("QuickBooks security check failed.");
    }

    if (!code || !realmId) {
      return res.status(400).send("Missing QuickBooks authorization data.");
    }

    const redirectUri =
      process.env.QB_REDIRECT_URI ||
      "https://field-crm-rosa.vercel.app/api/quickbooks/callback";

    const credentials = Buffer.from(
      `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json(data);
    }

    res.setHeader("Set-Cookie", [
      `qb_access=${encodeURIComponent(data.access_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3500`,
      `qb_refresh=${encodeURIComponent(data.refresh_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=5184000`,
      `qb_realm=${encodeURIComponent(realmId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=5184000`,
      `qb_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    ]);

    res.redirect("/?quickbooks=connected");
  } catch (error) {
    console.error(error);
    res.status(500).send("Could not connect to QuickBooks.");
  }
}

