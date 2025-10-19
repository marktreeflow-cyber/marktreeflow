// Next.js API Route
export default async function handler(req, res) {
  const { query: { provider, redirect_to = '/' }, headers } = req;
  // Buat state + simpan
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(headers.authorization?.replace('Bearer ', ''));
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const state = crypto.randomUUID();
  await supabase.from('mplan.oauth_states').insert({
    user_id: user.id,
    provider,
    state,
    redirect_to
  });

  // Redirect ke authorization URL sesuai provider
  const authUrls = {
    instagram: new URL('https://www.facebook.com/v19.0/dialog/oauth'),
    tiktok:    new URL('https://www.tiktok.com/v2/auth/authorize/'),
    youtube:   new URL('https://accounts.google.com/o/oauth2/v2/auth'),
    x:         new URL('https://twitter.com/i/oauth2/authorize')
  };

  const paramsMap = {
    instagram: {
      client_id: process.env.IG_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/instagram/callback`,
      response_type: 'code',
      state,
      scope: [
        'pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish'
      ].join(',')
    },
    tiktok: {
      client_key: process.env.TT_CLIENT_ID, // TikTok menyebut client_id sebagai client_key
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/tiktok/callback`,
      response_type: 'code',
      state,
      scope: ['user.info.basic','video.upload','video.publish'].join(',')
    },
    youtube: {
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/youtube/callback`,
      response_type: 'code',
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      state
    },
    x: {
      client_id: process.env.X_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/x/callback`,
      response_type: 'code',
      state,
      scope: 'tweet.write users.read offline.access',
      code_challenge: state.replace(/-/g,''),
      code_challenge_method: 'plain'
    }
  };

  const url = authUrls[provider];
  Object.entries(paramsMap[provider]).forEach(([k,v]) => url.searchParams.set(k, v));
  return res.redirect(url.toString());
}
