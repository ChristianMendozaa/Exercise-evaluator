"use client"

import type React from "react"

import { useState } from "react"
import { Dumbbell, Wind, ArrowUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ConfigExercise } from "@/components/config-exercise"

type Exercise = {
  id: string
  name: string
  icon: React.ReactNode
  description: string
}

const exercisesList: Exercise[] = [
  {
    id: "bicep-curl",
    name: "Curl de Bíceps",
    icon: <Dumbbell className="h-10 w-10 text-orange-500" />,
    description: "Fortalece tus bíceps con este ejercicio clásico",
  },
  {
    id: "jumping-jacks",
    name: "Jumping Jacks",
    icon: <Wind className="h-10 w-10 text-orange-500" />,
    description: "Ejercicio cardiovascular de cuerpo completo",
  },
  {
    id: "push-ups",
    name: "Push-ups",
    icon: <ArrowUp className="h-10 w-10 text-orange-500" />,
    description: "Trabaja pecho, hombros y tríceps",
  },
]

export function Exercises() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  if (selectedExercise) {
    return <ConfigExercise exercise={selectedExercise} onBack={() => setSelectedExercise(null)} />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {exercisesList.map((exercise) => (
        <Card
          key={exercise.id}
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-orange-500 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-orange-500"
          onClick={() => setSelectedExercise(exercise)}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-navy-900 dark:bg-slate-700 p-4 rounded-full mb-4">{exercise.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-navy-900 dark:text-white">{exercise.name}</h3>
              <p className="text-slate-600 dark:text-slate-400">{exercise.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
