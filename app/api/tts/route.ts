// /app/api/tts/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",  // Puedes cambiar a "fable", "onyx", etc.
      input: text
    })
  })

  const audioBuffer = await response.arrayBuffer()
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg"
    }
  })
}
