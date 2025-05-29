// components/chatbot.tsx
"use client"

import { useState, useImperativeHandle, forwardRef } from "react"
import { MessageCircle, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export type ChatbotHandle = {
  addBotMessage: (text: string) => void
  sendExerciseSummary: (json: any) => void
}

type Message = {
  id: number
  text: string
  isUser: boolean
}

type ChatbotProps = {
  exerciseName: string
}

export const Chatbot = forwardRef<ChatbotHandle, ChatbotProps>(
  ({ exerciseName }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([{
      id: 1,
      text: `¡Hola! Soy tu asistente de ${exerciseName}. ¿En qué puedo ayudarte?`,
      isUser: false
    }])
    const [newMessage, setNewMessage] = useState("")

    const speakText = async (text: string) => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        })
        const blob = await res.blob()
        const audio = new Audio(URL.createObjectURL(blob))
        audio.play()
      } catch (error) {
        console.error("Error reproduciendo voz:", error)
      }
    }

    useImperativeHandle(ref, () => ({
      addBotMessage(text: string) {
        setMessages(msgs => [
          ...msgs,
          { id: Date.now(), text, isUser: false }
        ])
        speakText(text)
      },
      async sendExerciseSummary(summaryJson: any) {
        const prompt = `Evalúa esta serie de ${exerciseName} como si hubieras observado el video directamente. Proporciona un análisis general del desempeño, sin listar repetición por repetición. Sé claro y breve. Basa tus conclusiones principalmente en el campo \"isValid\" para estimar si en general se ejecutó bien o no pero no lo menciones en la respuesta.`

        setMessages(msgs => [
          ...msgs,
          {
            id: Date.now(),
            text: `Datos:\n${JSON.stringify(summaryJson, null, 2)}`,
            isUser: true
          }
        ])

        try {
          const response = await fetch("/api/gpt-feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, data: summaryJson, max_tokens: 200 })
          })
          const data = await response.json()
          setMessages(msgs => [...msgs, { id: Date.now(), text: data.result, isUser: false }])
          speakText(data.result)
        } catch (err) {
          const errMsg = "Hubo un error al obtener feedback del modelo GPT."
          setMessages(msgs => [...msgs, { id: Date.now(), text: errMsg, isUser: false }])
        }
      }
    }))

    const handleSendMessage = async () => {
      if (!newMessage.trim()) return
      const userMsg: Message = { id: Date.now(), text: newMessage, isUser: true }
      setMessages(msgs => [...msgs, userMsg])

      try {
        const systemPrompt = `Responde como un entrenador personal especializado en técnica de ejercicios. No respondas nada que no tenga que ver con correcciones, consejos o explicación sobre el ejercicio ${exerciseName}.`
        const response = await fetch("/api/gpt-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: systemPrompt + "\nUsuario: " + newMessage,
            max_tokens: 200
          })
        })
        const data = await response.json()
        setMessages(msgs => [...msgs, { id: Date.now(), text: data.result, isUser: false }])
        speakText(data.result)
      } catch (err) {
        const errMsg = "Hubo un error al obtener respuesta del modelo GPT."
        setMessages(msgs => [...msgs, { id: Date.now(), text: errMsg, isUser: false }])
      }

      setNewMessage("")
    }

    if (!isOpen) {
      return (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 rounded-full h-14 w-14 p-0 bg-orange-500 hover:bg-orange-600 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )
    }

    return (
      <Card className="fixed bottom-4 right-4 w-80 h-96 shadow-lg flex flex-col z-50">
        <CardHeader className="bg-navy-900 text-white py-2 px-4 flex justify-between">
          <CardTitle className="text-sm">Asistente de {exerciseName}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4 text-white" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.isUser ? "justify-end" : "justify-start"}`}>
              <div className={`${m.isUser ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-800"} max-w-[80%] rounded-lg px-3 py-2`}>
                {m.text}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-2 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSendMessage} className="bg-orange-500 hover:bg-orange-600">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    )
  }
)
