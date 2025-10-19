export default async function handler(req, res) {
  const {
    query: { code, state },
    url,
  } = req;

  // ambil nama provider dari URL (instagram|tiktok|youtube|x)
  const provider = url.split("/").slice(-2, -1)[0];

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 🔹 Validasi state dari table oauth_states
  const { data: rows } = await supabase
    .from("mplan.oauth_states")
    .select("*")
    .eq("provider", provider)
    .eq("state", state)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!rows?.length) return res.status(400).send("Invalid state");
  const { user_id, redirect_to } = rows[0];

  // 🔹 Tukar authorization code → access_token
  async function exchangeToken() {
    switch (provider) {
      case "instagram":
        return {
          access_token: "ENCRYPT_ME",
          refresh_token: null,
          expires_in: 60 * 24 * 60 * 60,
          account_external_id: "1789xxxxxxxx", // ig_user_id
          account_handle: "@your_ig",
        };

      case "tiktok":
        return {
          access_token: "ENCRYPT_ME",
          refresh_token: "REFRESH_ME",
          expires_in: 3600,
          account_external_id: "tik_tok_uid",
          account_handle: "@your_tt",
        };

      case "youtube":
        return {
          access_token: "ENCRYPT_ME",
          refresh_token: "REFRESH_ME",
          expires_in: 3600,
          account_external_id: "UCxxxxxxxxxx", // channelId
          account_handle: "Channel Title",
        };

      case "x":
        return {
          access_token: "ENCRYPT_ME",
          refresh_token: "REFRESH_ME",
          expires_in: 7200,
          account_external_id: "x_user_id",
          account_handle: "@your_x",
        };

      default:
        throw new Error("Unsupported provider");
    }
  }

  const tok = await exchangeToken();

  // 🔹 Simpan ke DB (upsert akun sosial media)
  const { data: acc, error } = await supabase
    .from("mplan.social_accounts")
    .upsert({
      user_id,
      provider,
      account_external_id: tok.account_external_id,
      account_handle: tok.account_handle,
      scopes: [], // opsional: isi actual scopes dari response
      access_token: supabase.rpc ? undefined : null,
    })
    .select()
    .single();

  if (error) {
    console.error("DB Error:", error);
    return res.status(500).json({ error: error.message });
  }

  // 🔹 Redirect balik ke halaman accounts
  return res.redirect(redirect_to || "/social/accounts");
}
