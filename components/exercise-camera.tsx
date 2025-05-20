// components/ExerciseCamera.tsx
"use client"

import { useState, useEffect, useRef, ChangeEvent } from "react"
import {
  Play,
  Pause,
  CameraOff,
  RotateCcw,
  Upload,
  RefreshCcw,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { PoseDetection, PoseData } from "./pose-detection"
import { Chatbot, ChatbotHandle } from "./chatbot"
import { Countdown } from "./countdown"

type ExerciseCameraProps = {
  exercise: { id: string; name: string; icon: React.ReactNode }
  reps: number
  sets: number
  onBack: () => void
}

export function ExerciseCamera({
  exercise,
  reps,
  sets,
  onBack,
}: ExerciseCameraProps) {
  const [currentRep, setCurrentRep] = useState(1)
  const [currentSet, setCurrentSet] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [phase, setPhase] = useState<"warming" | "countdown" | "running">(
    "warming"
  )
  const [isUploaded, setIsUploaded] = useState(false)

  const allRepsRef = useRef<PoseData[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chatbotRef = useRef<ChatbotHandle>(null)

  // 1) Arrancar cámara
  useEffect(() => {
    if (isUploaded) return
    let canceled = false
    const start = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        if (canceled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.muted = true
          await videoRef.current.play()
        }
      } catch (e) {
        console.error("No se pudo iniciar la cámara:", e)
      }
    }
    start()
    return () => {
      canceled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [isUploaded])

  // 2) Subir video
  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    streamRef.current?.getTracks().forEach((t) => t.stop())
    const url = URL.createObjectURL(file)
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = url
      videoRef.current.muted = true
      videoRef.current.play()
      setIsUploaded(true)
    }
  }

  // 3) Reproducir de nuevo
  const handleReplay = () => {
    if (!videoRef.current) return
    videoRef.current.currentTime = 0
    videoRef.current.play()
    setIsPaused(false)
  }

  // 4) Play/Pause
  const handlePause = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) videoRef.current.play()
    else videoRef.current.pause()
    setIsPaused((p) => !p)
  }

  // 5) Siguiente rep
  const handleNextRep = () => {
    if (currentRep < reps) setCurrentRep((r) => r + 1)
    else if (currentSet < sets) {
      setCurrentSet((s) => s + 1)
      setCurrentRep(1)
    }
  }

  // 6) Finalizar
  const handleFinish = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onBack()
  }

  // 7) Datos de pose
  const handlePoseData = (data: PoseData) => {
    allRepsRef.current.push(data)
    const g = data.repetition
    const newSet = Math.min(Math.ceil(g / reps), sets)
    const newRep = ((g - 1) % reps) + 1
    if (newSet !== currentSet) setCurrentSet(newSet)
    if (newRep !== currentRep) setCurrentRep(newRep)

    if (g % reps === 0) {
      const idx = g / reps - 1
      const slice = allRepsRef.current.slice(idx * reps, idx * reps + reps)
      chatbotRef.current?.addBotMessage(
        `📊 Serie ${idx + 1} completada: ${exercise.name}\n` +
          JSON.stringify(slice, null, 2)
      )
    }

    const absolute = (currentSet - 1) * reps + currentRep
    if (g > absolute) {
      if (!data.isValid) {
        let m = "Mejora tu técnica: "
        if ((data.minAngle ?? 0) >= 60) m += "Flexiona más. "
        if ((data.maxAngle ?? 0) <= 150) m += "Extiende más. "
        if ((data.elbowMovement ?? 0) >= 0.02) m += "Codo estable. "
        if ((data.backAngle ?? 0) <= 170) m += "Sin inclinar atrás. "
        if ((data.shoulderMovement ?? 0) >= 0.03) m += "Hombro quieto. "
        if ((data.hunching ?? 0) <= 160) m += "Espalda recta. "
        setFeedback(m)
      } else {
        setFeedback("¡Excelente repetición! ✅")
      }
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  const repProgress = (currentRep / reps) * 100
  const setProgress = (currentSet / sets) * 100

  // 8) Fases
  const onPoseReady = () => {
    if (phase === "warming") setPhase("countdown")
  }
  const onCountdownComplete = () => setPhase("running")

  return (
    <div className="max-w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Video 16:9 */}
      <div className="lg:col-span-2 w-full relative bg-black">
        <div className="w-full" style={{ paddingTop: "56.25%" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain bg-black"
            style={{ display: isPaused ? "none" : "block" }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              display: phase === "running" && !isPaused ? "block" : "none",
            }}
          />

          {phase === "warming" && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-xl">
              Buscando pose…
            </div>
          )}
          {phase === "countdown" && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
              <Countdown
                seconds={3}
                exercise={exercise}
                onComplete={onCountdownComplete}
              />
            </div>
          )}

          <PoseDetection
            videoRef={videoRef}
            canvasRef={canvasRef}
            exerciseType={exercise.id as
              | "bicep-curl"
              | "jumping-jacks"
              | "push-ups"}
            onPoseReady={onPoseReady}
            onPoseData={handlePoseData}
          />
        </div>
      </div>

      {/* Panel lateral y controles arriba */}
      <div className="lg:col-span-1 flex flex-col">
        <div className="relative mb-4 flex gap-2 justify-center">
          {/* Upload */}
          <div className="relative inline-block">
            <Button variant="secondary" size="icon">
              <Upload className="h-5 w-5" />
            </Button>
            <input
              type="file"
              accept="video/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleVideoUpload}
            />
          </div>

          {/* Replay */}
          {isUploaded && (
            <Button variant="secondary" size="icon" onClick={handleReplay}>
              <RefreshCcw className="h-5 w-5" />
            </Button>
          )}

          {/* Play/Pause */}
          <Button variant="secondary" size="icon" onClick={handlePause}>
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>

          {/* Home */}
          <Button variant="secondary" size="icon" onClick={handleFinish}>
            <Home className="h-5 w-5" />
          </Button>
        </div>

        {/* Progreso */}
        <Card className="p-6 flex-1">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            {exercise.icon}
            <span className="ml-2">{exercise.name}</span>
          </h2>
          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <span>Repetición</span>
              <span className="font-bold">
                {currentRep} / {reps}
              </span>
            </div>
            <Progress
              value={repProgress}
              className="h-2"
              indicatorClassName="bg-orange-500"
            />

            <div className="flex justify-between items-center pt-4">
              <span>Serie</span>
              <span className="font-bold">
                {currentSet} / {sets}
              </span>
            </div>
            <Progress
              value={setProgress}
              className="h-2"
              indicatorClassName="bg-orange-500"
            />

            <Button
              variant="outline"
              onClick={handleNextRep}
              className="w-full mt-4"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Siguiente
            </Button>
          </div>
        </Card>

        {feedback && (
          <div className="mt-2 text-center text-white">{feedback}</div>
        )}
      </div>

      {/* Chatbot */}
      <Chatbot ref={chatbotRef} exerciseName={exercise.name} />
    </div>
  )
}
