"use client"

import type React from "react"
import { useState, useEffect } from "react"

type CountdownProps = {
  seconds: number
  onComplete: () => void
  exercise: {
    name: string
    icon: React.ReactNode
  }
}

export function Countdown({ seconds, onComplete, exercise }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(seconds)

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete()
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, onComplete])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">¡Prepárate para comenzar!</h2>
        <div className="flex items-center justify-center mb-6">
          {exercise.icon}
          <span className="ml-2 text-xl text-white">{exercise.name}</span>
        </div>
        <div className="bg-black text-white text-7xl font-bold rounded-full w-40 h-40 flex items-center justify-center mx-auto mb-8 animate-pulse">
          {timeLeft}
        </div>
        <p className="text-white text-xl">Posiciónate frente a la cámara</p>
      </div>
    </div>
  )
}
