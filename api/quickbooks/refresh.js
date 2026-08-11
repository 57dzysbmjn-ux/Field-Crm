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
    const cookies = getCookies(req);

    if (!cookies.qb_refresh || !cookies.qb_realm) {
      return res.status(401).json({
        error: "QuickBooks needs to be reconnected.",
        reconnect: true
      });
    }

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
          grant_type: "refresh_token",
          refresh_token: cookies.qb_refresh
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return res.status(401).json({
        error: "QuickBooks needs to be reconnected.",
        reconnect: true
      });
    }

    res.setHeader("Set-Cookie", [
      `qb_access=${encodeURIComponent(data.access_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3500`,
      `qb_refresh=${encodeURIComponent(data.refresh_token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=8640000`,
      `qb_realm=${encodeURIComponent(cookies.qb_realm)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=8640000`
    ]);

    return res.status(200).json({
      success: true,
      connected: true
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not refresh QuickBooks connection."
    });
  }
}
