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
    const cookies = getCookies(req);

    if (!cookies.qb_access || !cookies.qb_realm) {
      return res.status(401).json({
        error: "QuickBooks is not connected."
      });
    }

    const { customerName, project, amount } = req.body || {};

    if (!customerName || !project || !amount) {
      return res.status(400).json({
        error: "Customer, project and amount are required."
      });
    }

    const amountNumber = Number(
      String(amount).replace(/[$,\s]/g, "")
    );

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        error: "Estimate amount must be a valid number."
      });
    }

    const environment = process.env.QB_ENV || "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const customerQuery = encodeURIComponent(
      `select Id, DisplayName from Customer where DisplayName = '${escapeQueryValue(customerName)}'`
    );

    const customerResponse = await fetch(
      `${baseUrl}/v3/company/${cookies.qb_realm}/query?query=${customerQuery}`,
      {
        headers: {
          Authorization: `Bearer ${cookies.qb_access}`,
          Accept: "application/json"
        }
      }
    );

    const customerData = await customerResponse.json();

    if (!customerResponse.ok) {
      return res.status(customerResponse.status).json(customerData);
    }

    const qbCustomer = customerData.QueryResponse?.Customer?.[0];

    if (!qbCustomer) {
      return res.status(404).json({
        error: "Sync this customer to QuickBooks first."
      });
    }

    const payload = {
      CustomerRef: {
        value: qbCustomer.Id
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
      `${baseUrl}/v3/company/${cookies.qb_realm}/estimate`,
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
      estimate: data.Estimate
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not create QuickBooks estimate."
    });
  }
}
