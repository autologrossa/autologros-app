// Vercel Serverless Function — proxy BCRA
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { cuil } = req.query;
  if (!cuil) return res.status(400).json({ error: 'CUIL requerido' });

  try {
    const r = await fetch(
      `https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuil}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error consultando BCRA', detalle: e.message });
  }
}
