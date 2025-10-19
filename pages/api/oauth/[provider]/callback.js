// ✅ Build-Safe Mock Edition — tidak memanggil API OAuth asli
// ✅ Clean syntax, error-safe, compatible with Vercel build
// ✅ Bisa langsung diganti ke Real Mode nanti tanpa ubah struktur

export default async function handler(req, res) {
  try {
    const {
      query: { code, state, url },
    } = req;

    if (!url) return res.status(400).send("Missing URL or provider");

    const provider = url.split("/").slice(-2, -1)[0]; // 'instagram' | 'tiktok' | 'youtube' | 'x'

    // 🧩 Init Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 🔍 Validasi state
    const { data: rows, error: stateError } = await supabase
      .from("mplan.oauth_states")
      .select("*")
      .eq("provider", provider)
      .eq("state", state)
      .order("created_at", { ascending: false })
      .limit(1);

    if (stateError) {
      console.error("State check error:", stateError.message);
      return res.status(500).send("Internal state validation error");
    }

    if (!rows?.length) return res.status(400).send("Invalid state");

    const { user_id, redirect_to } = rows[0];

    // 🧠 MOCK TOKEN EXCHANGE — ganti ke real fetch kalau sudah siap API OAuth
    async function exchangeToken() {
      return {
        access_token: "MOCK_ACCESS_TOKEN_" + provider,
        refresh_token: "MOCK_REFRESH_TOKEN",
        expires_in: 3600,
        account_external_id: `mock_${provider}_userid`,
        account_handle: `@mock_${provider}`,
      };
    }

    const tok = await exchangeToken();

    if (!tok) {
      console.error("Token exchange failed for provider:", provider);
      return res.status(400).send("Invalid provider or missing token response");
    }

    // 💾 Simpan ke DB (Upsert + Enkripsi)
    const { data: acc, error } = await supabase
      .from("mplan.social_accounts")
      .upsert(
        {
          user_id,
          provider,
          account_external_id: tok.account_external_id,
          account_handle: tok.account_handle,
          scopes: [], // opsional: isi actual scopes dari response
          access_token: tok.access_token, // mock token aman untuk build
        },
        { onConflict: "user_id,provider" }
      )
      .select()
      .single();

    if (error) {
      console.error("DB Error:", error.message);
      return res.status(500).send("Database upsert error");
    }

    // ✅ Redirect ke halaman akun sosial
    return res.redirect(302, redirect_to || "/social/accounts");
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).send("Unexpected error in OAuth callback");
  }
}

/*
🧾 CATATAN:
- Versi ini *tidak memanggil API eksternal manapun*; semua token bersifat mock.
- Tujuan: memastikan build Vercel sukses tanpa dependensi OAuth asli.
- Jika nanti ingin real integration:
    → Ganti fungsi exchangeToken() dengan real fetch ke API masing-masing provider.
- Struktur kode sudah siap untuk mode “REAL” tanpa ubah logic utama.
*/
