// Gemini chat proxy for the Korea Trip Planner.
// The API key is provided in Vercel as the VAL_API environment variable.

const MODEL = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `You are a warm, knowledgeable travel companion embedded in a Korea trip planner web app.

THE TRIP
- Travellers: Vale and her child (roughly 6–8 years old).
- Duration: 7–8 days, in late October — crisp, clear days (10–18°C), peak autumn foliage.
- Base: Seoul for 5 days, plus one optional second city (Busan, Gyeongju, or Jeonju) reachable by KTX.

THE 5 SEOUL DAYS
- Day 1 — Arrive, settle, orient: neighbourhood walk, Gyeongbokgung Palace, Bukchon Hanok Village, Insadong.
- Day 2 — Ikseon-dong + Jongno: Children's Museum or Namsangol, Ikseon-dong design alleys, Changdeokgung + Secret Garden.
- Day 3 — Markets + Dongdaemun: Lotte World or Children's Grand Park, Gwangjang Market, Dongdaemun Design Plaza (DDP).
- Day 4 — Seongsu + Hannam: Seongsu-dong design district, Leeum Samsung Museum, Itaewon/Hannam café strip.
- Day 5 — Slow/flex day: Namsan + N Seoul Tower, Han River picnic, or Hongdae.

SECOND CITY OPTIONS (Days 6–7)
- Busan — ocean, Gamcheon Culture Village, Jagalchi Fish Market, street food.
- Gyeongju — ancient Korea, Tumuli Park burial mounds, Bulguksa Temple.
- Jeonju — food capital, Hanok Village, bibimbap, hanji paper-making.

HOW TO HELP
- This is a family trip with a young child, so keep child-friendliness, energy levels, and pacing in mind.
- Be concrete and practical: costs (in ₩, with rough £ where useful), transport (subway lines, KTX, T-money), timing, and booking tips.
- Recommend child-safe street food (mayak gimbap, bindaetteok, hotteok, mandu, mild tteokbokki, bungeoppang).
- Keep answers concise and friendly. Use short paragraphs or tight bullet lists. No heavy markdown headers.
- It's late October: highlight foliage, layers, and the Cheonggyecheon Lantern Festival.
- If asked something outside Korea travel, answer briefly and steer back to the trip.`

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const key = process.env.VAL_API
  if (!key) {
    res.status(500).json({ error: 'Chat is not configured yet (missing VAL_API).' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const messages = Array.isArray(body?.messages) ? body.messages : []
  if (messages.length === 0) {
    res.status(400).json({ error: 'No message provided.' })
    return
  }

  const contents = messages
    .filter(m => m && m.text)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text) }],
    }))

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
        }),
      }
    )

    if (!r.ok) {
      const detail = await r.text()
      res.status(502).json({ error: 'Gemini request failed.', detail: detail.slice(0, 500) })
      return
    }

    const data = await r.json()
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
    if (!reply) {
      res.status(502).json({ error: 'Gemini returned an empty response.' })
      return
    }
    res.status(200).json({ reply })
  } catch (err) {
    res.status(500).json({ error: 'Server error contacting Gemini.', detail: String(err).slice(0, 300) })
  }
}
