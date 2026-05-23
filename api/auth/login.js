const { makeToken, publicUser, readPortalUser } = require('../_portal');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, audience } = req.body || {};
  if (audience !== 'client_portal') return res.status(403).json({ error: 'Invalid portal audience' });
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = await readPortalUser(email);
  if (!user || !user.portalApproved || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.status(200).json({ accessToken: makeToken(user), user: publicUser(user) });
};
