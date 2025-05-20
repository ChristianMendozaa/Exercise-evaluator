"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExerciseCamera } from "@/components/exercise-camera"

type Exercise = {
  id: string
  name: string
  icon: React.ReactNode
  description: string
}

type ConfigExerciseProps = {
  exercise: Exercise
  onBack: () => void
}

export function ConfigExercise({ exercise, onBack }: ConfigExerciseProps) {
  const [reps, setReps] = useState("10")
  const [sets, setSets] = useState("3")
  const [stage, setStage] = useState<"config" | "exercise">("config")

  const handleStartExercise = () => {
    if (!reps || !sets || parseInt(reps) <= 0 || parseInt(sets) <= 0) return
    setStage("exercise")
  }

  if (stage === "exercise") {
    return (
      <ExerciseCamera
        exercise={exercise}
        reps={parseInt(reps)}
        sets={parseInt(sets)}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-6 pl-0 dark:text-white">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a ejercicios
      </Button>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-navy-900 dark:text-white mb-6 flex items-center">
          {exercise.icon}
          <span className="ml-2">{exercise.name}</span>
        </h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reps" className="text-lg dark:text-white">Repeticiones</Label>
            <Input
              id="reps"
              type="number"
              value={reps}
              onChange={e => setReps(e.target.value)}
              min="1"
              className="text-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sets" className="text-lg dark:text-white">Series</Label>
            <Input
              id="sets"
              type="number"
              value={sets}
              onChange={e => setSets(e.target.value)}
              min="1"
              className="text-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>

          <Button
            onClick={handleStartExercise}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg"
            size="lg"
          >
            Comenzar Ejercicio
          </Button>
        </div>
      </div>
    </div>
  )
}
