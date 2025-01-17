import app from '../server';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Forward the request to your Express app
  return app(req, res);
}
