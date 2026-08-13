import { getDb } from "./db.js";

export default async function handler(req, res) {
  try {
    const sql = getDb();

    const rows = await sql`
      SELECT COUNT(*)::int AS count
      FROM quickbooks_tokens
    `;

    return res.status(200).json({
      databaseConnected: true,
      tokenRows: rows[0]?.count ?? 0
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      databaseConnected: false,
      error: error.message
    });
  }
}
