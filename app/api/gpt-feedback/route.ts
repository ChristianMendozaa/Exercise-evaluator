// /app/api/gpt-feedback/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Eres un entrenador personal experto en forma física y técnica de ejercicios." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
  })

  const json = await res.json()
  const result = json.choices?.[0]?.message?.content || "No se obtuvo respuesta."
  return NextResponse.json({ result })
}
