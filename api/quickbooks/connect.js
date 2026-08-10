import crypto from "crypto";

export default async function handler(req, res) {
  const state = crypto.randomUUID();

  const redirectUri =
    process.env.QB_REDIRECT_URI ||
    "https://field-crm-rosa.vercel.app/api/quickbooks/callback";

  const params = new URLSearchParams({
    client_id: process.env.QB_CLIENT_ID,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirectUri,
    state
  });

  res.setHeader(
    "Set-Cookie",
    `qb_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  res.redirect(
    `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
  );
}
