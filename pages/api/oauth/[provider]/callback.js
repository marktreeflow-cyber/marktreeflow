export default async function handler(req, res) {
  const { query: { code, state }, url } = req;
  const provider = url.split('/').slice(-2, -1)[0]; // 'instagram'|'tiktok'|'youtube'|'x'

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Validasi state
  const { data: rows } = await supabase
    .from('mplan.oauth_states')
    .select('*')
    .eq('provider', provider)
    .eq('state', state)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!rows?.length) return res.status(400).send('Invalid state');
  const { user_id, redirect_to } = rows[0];

  // Tukar code → token per provider
  async function exchangeToken() {
    if (provider === 'instagram') {
      // Step: code -> FB short-lived -> exchange long-lived -> page token -> ig_user
      // (Ringkasan implementasi, panggilan actual gunakan fetch)
      // Simpan hasil final: page_token/ig_user_id
      // ... lakukan fetch berantai sesuai Graph API
      return {
        access_token: 'ENCRYPT_ME',
        refresh_token: null,
        expires_in: 60 * 24 * 60 * 60,
        account_external_id: '1789xxxxxxxx', // ig_user_id
        account_handle: '@your_ig'
      };
    }
    if (provider === 'tiktok') {
      // POST https://open.tiktokapis.com/v2/oauth/token/
      // body: client_key, client_secret, code, grant_type=authorization_code, redirect_uri
      return {
        access_token: 'ENCRYPT_ME',
        refresh_token: 'REFRESH_ME',
        expires_in: 3600,
        account_external_id: 'tik_tok_uid',
        account_handle: '@your_tt'
      };
    }
    if (provider === 'youtube') {
      // POST https://oauth2.googleapis.com/token
      // scope youtube.upload
      return {
        access_token: 'ENCRYPT_ME',
        refresh_token: 'REFRESH_ME',
        expires_in: 3600,
        account_external_id: 'UCxxxxxxxxxx', // channelId
        account_handle: 'Channel Title'
      };
    }
    if (provider === 'x') {
      // POST https://api.twitter.com/2/oauth2/token (PKCE)
      return {
        access_token: 'ENCRYPT_ME',
        refresh_token: 'REFRESH_ME',
        expires_in: 7200,
        account_external_id: 'x_user_id',
        account_handle: '@your_x'
      };
    }
  }

  const tok = await exchangeToken();

  // Simpan ke DB (enkripsi)
  const { data: acc, error } = await supabase
    .from('mplan.social_accounts')
    .upsert({
      user_id,
      provider,
      account_external_id: tok.account_external_id,
      account_handle: tok.account_handle,
      scopes: [], -- opsional: isi actual scopes dari response
      access_token: supabase.rpc ? undefined : null
    })
    .select()
    .single();

  // Karena Supabase RPC tidak bisa dipakai langsung di upsert di sini, pakai raw SQL via fetch ke REST:
  // 🔎 Alternatif praktis: bikin FUNCTION server-side untuk upsert + enkripsi.
  // Lihat helper di bawah.
  return res.redirect(redirect_to || '/social/accounts');
}
