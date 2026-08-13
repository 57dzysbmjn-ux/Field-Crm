import { getDb } from "./db.js";

export default async function handler(req, res) {
  try {
    const sql = getDb();

    const rows = await sql`
      SELECT realm_id
      FROM quickbooks_tokens
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const connection = rows[0];

    return res.status(200).json({
      connected: Boolean(connection),
      realmId: connection?.realm_id || null
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      connected: false,
      realmId: null,
      error: "Could not check QuickBooks connection."
    });
  }
}
