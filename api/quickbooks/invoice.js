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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST required." });
  }

  try {
    const cookies = getCookies(req);

    if (!cookies.qb_access || !cookies.qb_realm) {
      return res.status(401).json({
        error: "QuickBooks is not connected."
      });
    }

    const { customerId, project, amount } = req.body || {};

    if (!customerId || !project || !amount) {
      return res.status(400).json({
        error: "Customer, project and amount are required."
      });
    }

    const amountNumber = Number(
      String(amount).replace(/[$,\s]/g, "")
    );

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        error: "Invoice amount must be a valid number."
      });
    }

    const environment = process.env.QB_ENV || "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const payload = {
      CustomerRef: {
        value: String(customerId)
      },
      PrivateNote: `Field CRM: ${project}`,
      Line: [
        {
          Amount: amountNumber,
          Description: project,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: {
              value: "1",
              name: "Services"
            },
            Qty: 1,
            UnitPrice: amountNumber
          }
        }
      ]
    };

    const response = await fetch(
      `${baseUrl}/v3/company/${cookies.qb_realm}/invoice`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cookies.qb_access}`,
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
      invoice: data.Invoice
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not create QuickBooks invoice."
    });
  }
}
