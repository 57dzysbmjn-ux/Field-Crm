import { neon } from "@neondatabase/serverless";

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(process.env.DATABASE_URL);
}

export async function saveQuickBooksTokens({
  realmId,
  accessToken,
  refreshToken,
  expiresAt
}) {
  const sql = getDb();

  await sql`
    INSERT INTO quickbooks_tokens (
      realm_id,
      access_token,
      refresh_token,
      expires_at,
      updated_at
    )
    VALUES (
      ${realmId},
      ${accessToken},
      ${refreshToken},
      ${expiresAt},
      NOW()
    )
    ON CONFLICT (realm_id)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `;
}

export async function getQuickBooksTokens(realmId) {
  const sql = getDb();

  const rows = await sql`
    SELECT
      realm_id,
      access_token,
      refresh_token,
      expires_at,
      updated_at
    FROM quickbooks_tokens
    WHERE realm_id = ${realmId}
    LIMIT 1
  `;

  return rows[0] || null;
}
