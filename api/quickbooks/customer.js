import { getDb } from "./db.js";

function escapeQueryValue(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const sql = getDb();

const rows = await sql\`
  SELECT realm_id, access_token
  FROM quickbooks_tokens
  ORDER BY updated_at DESC
  LIMIT 1
\`;

const tokens = rows[0];

    if (!tokens) {
      return res.status(401).json({
        error: "QuickBooks is not connected."
      });
    }

    const customer = req.body || {};

    if (!customer.name) {
      return res.status(400).json({
        error: "Customer name is required."
      });
    }

    const environment = process.env.QB_ENV || "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    // Check QuickBooks first so we don't create a duplicate.
    const query = encodeURIComponent(
      `select Id, DisplayName from Customer where DisplayName = '${escapeQueryValue(customer.name)}'`
    );

    const existingResponse = await fetch(
      `${baseUrl}/v3/company/${tokens.realm_id}/query?query=${query}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json"
        }
      }
    );

    const existingData = await existingResponse.json();

    if (!existingResponse.ok) {
      return res.status(existingResponse.status).json(existingData);
    }

    const existingCustomer =
      existingData.QueryResponse?.Customer?.[0];

    if (existingCustomer) {
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        customer: existingCustomer
      });
    }

    const payload = {
      DisplayName: customer.name,
      PrimaryEmailAddr: customer.email
        ? { Address: customer.email }
        : undefined,
      PrimaryPhone: customer.phone
        ? { FreeFormNumber: customer.phone }
        : undefined,
      BillAddr: customer.address
        ? { Line1: customer.address }
        : undefined
    };

    Object.keys(payload).forEach(
      key => payload[key] === undefined && delete payload[key]
    );

    const response = await fetch(
      `${baseUrl}/v3/company/${tokens.realm_id}/customer`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json({
      success: true,
      alreadyExists: false,
      customer: data.Customer
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not sync QuickBooks customer."
    });
  }
}
