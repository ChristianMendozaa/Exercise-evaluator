import { Exercises } from "@/components/exercises"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />
      <div className="container px-4 py-8 mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Bienvenido a Fitness Buddy</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Selecciona un ejercicio para comenzar tu entrenamiento
        </p>
        <Exercises />
      </div>
    </main>
  )
}
