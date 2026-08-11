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
    const invoiceId = req.query.id;

    if (!cookies.qb_access || !cookies.qb_realm) {
      return res.status(401).json({
        error: "QuickBooks is not connected."
      });
    }

    if (!invoiceId) {
      return res.status(400).json({
        error: "Invoice ID is required."
      });
    }

    const environment = process.env.QB_ENV || "sandbox";

    const baseUrl =
      environment === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${cookies.qb_realm}/invoice/${encodeURIComponent(invoiceId)}`,
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

    const invoice = data.Invoice;

    const total = Number(invoice.TotalAmt || 0);
    const balance = Number(invoice.Balance || 0);

    let status = "Open";

    if (balance <= 0) {
      status = "Paid";
    } else if (balance < total) {
      status = "Partially Paid";
    }

    return res.status(200).json({
      success: true,
      id: invoice.Id,
      total,
      balance,
      status
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not load invoice status."
    });
  }
}
