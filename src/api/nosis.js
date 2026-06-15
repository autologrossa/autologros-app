// Vercel Serverless Function — proxy Nosis WS01
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { cuil, nombre, apellido } = req.query;
  if (!cuil) return res.status(400).json({ error: 'CUIL requerido' });

  const apiKey = process.env.NOSIS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key de Nosis no configurada' });

  const params = new URLSearchParams({
    Documento: cuil,
    VR: '9',
    Format: 'JSON',
    RespuestaReducida: 'SI',
    Timeout: '30',
  });
  if (nombre && apellido) params.append('RazonSocial', `${nombre} ${apellido}`);

  try {
    const r = await fetch(
      `https://ws01.nosis.com/api/variables?${params.toString()}`,
      { headers: { 'X-API-KEY': apiKey, 'Accept': 'application/json' } }
    );
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error consultando Nosis', detalle: e.message });
  }
}
