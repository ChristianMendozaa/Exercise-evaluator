// components/PoseDetection.tsx
"use client"

import { useEffect, useRef } from "react"
import * as poseDetection from "@tensorflow-models/pose-detection"
import * as tf from "@tensorflow/tfjs"
import "@tensorflow/tfjs-backend-webgl"

export type PoseData = {
  repetition: number
  isValid: boolean

  // Curl de bíceps
  minAngle?: number
  maxAngle?: number
  elbowMovement?: number
  backAngle?: number
  shoulderMovement?: number
  hunching?: number

  // Jumping jacks
  armsRaised?: boolean
  legsOpened?: boolean
  legDistance?: string
  hipWidth?: string
  postureAngle?: string
  leftWristY?: string
  leftEyeY?: string
  rightEyeY?: string

  // Push-ups
  pushMinAngle?: number
  pushMaxAngle?: number
  pushAlignment?: number
}

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  exerciseType: "bicep-curl" | "jumping-jacks" | "push-ups"
  onPoseReady?: () => void
  onPoseData?: (data: PoseData) => void
}

export function PoseDetection({
  videoRef,
  canvasRef,
  exerciseType,
  onPoseReady,
  onPoseData,
}: Props) {
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null)
  const rafRef = useRef<number | null>(null)
  const readyFired = useRef(false)

  // Global repetition counter
  const countRef = useRef(0)

  // CURL state
  const stageCurlRef = useRef<"down" | "up">("down")
  const anglesCurlRef = useRef<number[]>([])
  const elbowPosCurlRef = useRef<[number, number][]>([])
  const shoulderPosCurlRef = useRef<[number, number][]>([])

  // JUMPING JACKS state
  const jjStateRef = useRef<"closed" | "open">("closed")
  const jjValidRef = useRef(true)

  // PUSH-UPS state
  const stagePushRef = useRef<"down" | "up">("up")
  const anglesPushRef = useRef<number[]>([])
  const alignPushRef = useRef<number[]>([])

  // angle between three points a-b-c
  const calculateAngle = (
    a: [number, number],
    b: [number, number],
    c: [number, number]
  ): number => {
    const radians =
      Math.atan2(c[1] - b[1], c[0] - b[0]) -
      Math.atan2(a[1] - b[1], a[0] - b[0])
    let angle = Math.abs((radians * 180) / Math.PI)
    return angle > 180 ? 360 - angle : angle
  }

  // 1) Load MoveNet detector
  useEffect(() => {
    let mounted = true
      ; (async () => {
        await tf.setBackend("webgl")
        await tf.ready()
        const det = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        )
        if (mounted) detectorRef.current = det
      })()
    return () => {
      mounted = false
      detectorRef.current?.dispose?.()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // 2) Main loop: estimate & draw
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const pairs = poseDetection.util.getAdjacentPairs(
      poseDetection.SupportedModels.MoveNet
    )

    let cancelled = false
    const loop = async () => {
      if (cancelled) return
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const vw = video.videoWidth, vh = video.videoHeight
      canvas.width = vw
      canvas.height = vh
      ctx.clearRect(0, 0, vw, vh)
      ctx.drawImage(video, 0, 0, vw, vh)

      const det = detectorRef.current
      if (det) {
        const poses = await det.estimatePoses(video)
        if (poses.length > 0) {
          const k = poses[0].keypoints

          if (!readyFired.current) {
            readyFired.current = true
            onPoseReady?.()
          }

          let poseData: PoseData | null = null

          // --- BICEP CURL ---
          if (exerciseType === "bicep-curl") {
            const i = { s: 5, e: 7, w: 9, hip: 11, ear: 3 }
            if ([i.s, i.e, i.w, i.hip, i.ear].every(idx => k[idx].score! > 0.3)) {
              const s = [k[i.s].x, k[i.s].y] as [number, number]
              const e = [k[i.e].x, k[i.e].y] as [number, number]
              const wpt = [k[i.w].x, k[i.w].y] as [number, number]
              const hip = [k[i.hip].x, k[i.hip].y] as [number, number]
              const ear = [k[i.ear].x, k[i.ear].y] as [number, number]

              const elbowAng = calculateAngle(s, e, wpt)
              anglesCurlRef.current.push(elbowAng)
              elbowPosCurlRef.current.push(e)
              shoulderPosCurlRef.current.push(s)

              if (elbowAng > 150 && stageCurlRef.current === "up") stageCurlRef.current = "down"
              if (elbowAng < 60 && stageCurlRef.current === "down") {
                stageCurlRef.current = "up"
                countRef.current += 1

                const minA = Math.min(...anglesCurlRef.current)
                const maxA = Math.max(...anglesCurlRef.current)
                const deltas = elbowPosCurlRef.current.map((p, j) => {
                  if (j === 0) return 0
                  const [x0, y0] = elbowPosCurlRef.current[j - 1]
                  return Math.hypot((p[0] - x0) / vw, (p[1] - y0) / vh)
                })
                const elbowMov = Math.max(...deltas)
                const backA = calculateAngle(hip, s, ear)
                const shm = Math.max(...shoulderPosCurlRef.current.map((p, j) => {
                  if (j === 0) return 0
                  return Math.abs((p[1] - shoulderPosCurlRef.current[j - 1][1]) / vh)
                }))
                const hunch = calculateAngle(ear, s, hip)

                const valid = minA < 60 && maxA > 150 && elbowMov < 0.02 && backA > 170 && shm < 0.03 && hunch > 160

                poseData = {
                  repetition: countRef.current,
                  isValid: valid,
                  minAngle: minA,
                  maxAngle: maxA,
                  elbowMovement: elbowMov,
                  backAngle: backA,
                  shoulderMovement: shm,
                  hunching: hunch,
                }

                anglesCurlRef.current = []
                elbowPosCurlRef.current = []
                shoulderPosCurlRef.current = []
              }
            }
          }

          // --- JUMPING JACKS ---
          else if (exerciseType === "jumping-jacks") {
            const idx = {
              lw: 9, rw: 10,
              le: 1, re: 2,
              la: 15, ra: 16,
              lh: 11, rh: 12
            }
            if ([
              idx.lw, idx.rw, idx.le, idx.re,
              idx.la, idx.ra, idx.lh, idx.rh
            ].every(i => k[i].score! > 0.3)) {
              const lwY = k[idx.lw].y, rwY = k[idx.rw].y
              const leY = k[idx.le].y, reY = k[idx.re].y
              const la = [k[idx.la].x, k[idx.la].y] as [number, number]
              const ra = [k[idx.ra].x, k[idx.ra].y] as [number, number]
              const lh = [k[idx.lh].x, k[idx.lh].y] as [number, number]
              const rh = [k[idx.rh].x, k[idx.rh].y] as [number, number]

              const armsRaised = lwY < leY && rwY < reY
              const distLegs = Math.hypot(la[0] - ra[0], la[1] - ra[1])
              const hipW = Math.hypot(lh[0] - rh[0], lh[1] - rh[1])
              const legsOpened = distLegs > hipW * 1.4
              const posture = calculateAngle(lh, [(lh[0] + rh[0]) / 2, (lh[1] + rh[1]) / 2], [k[idx.le].x, k[idx.le].y])

              if (armsRaised && legsOpened) {
                if (jjStateRef.current === "closed") {
                  jjStateRef.current = "open"
                  jjValidRef.current = true
                }
              } else {
                if (jjStateRef.current === "open") {
                  jjStateRef.current = "closed"
                  countRef.current += 1
                  poseData = {
                    repetition: countRef.current,
                    isValid: jjValidRef.current,
                    armsRaised,
                    legsOpened,
                    legDistance: distLegs.toFixed(3),
                    hipWidth: hipW.toFixed(3),
                    postureAngle: posture.toFixed(1),
                    leftWristY: lwY.toFixed(3),
                    leftEyeY: leY.toFixed(3),
                    rightEyeY: reY.toFixed(3),
                  }
                }
                jjValidRef.current = false
              }
            }
          }

          // --- PUSH-UPS ---
          else if (exerciseType === "push-ups") {
            // índices COCO en MoveNet para brazo derecho
            const i = { s: 6, e: 8, w: 10, hip: 12, ank: 14, ear: 4 }
            if ([i.s, i.e, i.w, i.hip, i.ank, i.ear].every(idx => k[idx].score! > 0.3)) {
              const s = [k[i.s].x, k[i.s].y] as [number, number]
              const e = [k[i.e].x, k[i.e].y] as [number, number]
              const w = [k[i.w].x, k[i.w].y] as [number, number]
              const hip = [k[i.hip].x, k[i.hip].y] as [number, number]
              const ank = [k[i.ank].x, k[i.ank].y] as [number, number]
              const ear = [k[i.ear].x, k[i.ear].y] as [number, number]

              const elbowAng = calculateAngle(s, e, w)
              const alignAng = calculateAngle(ear, hip, ank)
              anglesPushRef.current.push(elbowAng)
              alignPushRef.current.push(alignAng)

              // Nuevo orden: primero detectamos bajada (down)
              if (elbowAng < 90 && stagePushRef.current === "up") {
                stagePushRef.current = "down"
              }
              // y al volver a subir contamos
              if (elbowAng > 160 && stagePushRef.current === "down") {
                stagePushRef.current = "up"
                countRef.current += 1

                const minA = Math.min(...anglesPushRef.current)
                const maxA = Math.max(...anglesPushRef.current)
                const avgAlign =
                  alignPushRef.current.reduce((sum, v) => sum + v, 0) /
                  alignPushRef.current.length

                poseData = {
                  repetition: countRef.current,
                  isValid: minA > 55 && maxA > 155 && avgAlign > 160,
                  pushMinAngle: minA,
                  pushMaxAngle: maxA,
                  pushAlignment: Math.round(avgAlign),
                }

                anglesPushRef.current = []
                alignPushRef.current = []
              }
            }
          }

          // draw skeleton
          ctx.strokeStyle = "#FF7A00"
          ctx.lineWidth = 2
          for (const [i, j] of pairs) {
            const pa = k[i], pb = k[j]
            if (pa.score! > 0.3 && pb.score! > 0.3) {
              ctx.beginPath()
              ctx.moveTo(pa.x, pa.y)
              ctx.lineTo(pb.x, pb.y)
              ctx.stroke()
            }
          }
          ctx.fillStyle = "#00A3FF"
          for (const pt of k) {
            if (pt.score! > 0.3) {
              ctx.beginPath()
              ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI)
              ctx.fill()
            }
          }

          if (poseData) onPoseData?.(poseData)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    loop()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [exerciseType, onPoseReady, onPoseData])

  return null
}
