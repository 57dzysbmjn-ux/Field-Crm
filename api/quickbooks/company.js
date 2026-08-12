import { getDb } from "./db.js";

export default async function handler(req, res) {
  try {
    const sql = getDb();

    const rows = await sql`
      SELECT
        realm_id,
        access_token,
        refresh_token,
        expires_at
      FROM quickbooks_tokens
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const tokens = rows[0];

    if (!tokens) {
      return res.status(401).json({
        error: "QuickBooks is not connected."
      });
    }

    const environment = process.env.QB_ENV || "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${tokens.realm_id}/companyinfo/${tokens.realm_id}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not load QuickBooks company."
    });
  }
}
