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

    if (!cookies.qb_access || !cookies.qb_realm) {
      return res.status(401).json({
        error: "QuickBooks is not connected."
      });
    }

    const environment = process.env.QB_ENV || "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const query = encodeURIComponent(
      "select Id, Name, Type, Active from Item where Active = true"
    );

    const response = await fetch(
      `${baseUrl}/v3/company/${cookies.qb_realm}/query?query=${query}`,
      {
        headers: {
          Authorization: `Bearer ${cookies.qb_access}`,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json({
      items: data.QueryResponse?.Item || []
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not load QuickBooks items."
    });
  }
}
