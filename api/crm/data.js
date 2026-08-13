import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const CRM_ID = "main";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT data, updated_at
        FROM crm_data
        WHERE id = ${CRM_ID}
        LIMIT 1
      `;

      if (!rows[0]) {
        return res.status(200).json({
          data: {
            customers: [],
            estimates: [],
            events: [],
            notes: []
          },
          updatedAt: null
        });
      }

      return res.status(200).json({
        data: rows[0].data,
        updatedAt: rows[0].updated_at
      });
    }

    if (req.method === "POST") {
      const data = req.body;

      if (!data || typeof data !== "object") {
        return res.status(400).json({
          error: "CRM data is required."
        });
      }

      await sql`
        INSERT INTO crm_data (id, data, updated_at)
        VALUES (${CRM_ID}, ${JSON.stringify(data)}, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = NOW()
      `;

      return res.status(200).json({
        success: true
      });
    }

    return res.status(405).json({
      error: "GET or POST required."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not access CRM data."
    });
  }
}
