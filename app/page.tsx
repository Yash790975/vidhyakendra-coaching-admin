'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SplashScreen() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1897C6] via-[#67BAC3] to-[#F1AF37]">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-4 -top-4 h-72 w-72 animate-pulse rounded-full bg-white blur-3xl"></div>
        <div className="absolute -bottom-4 -right-4 h-72 w-72 animate-pulse rounded-full bg-white blur-3xl [animation-delay:1s]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000">
        {/* Logo Container */}
        <div className="group relative">
          <div className="absolute -inset-4 animate-pulse rounded-3xl bg-white/20 blur-xl transition-all duration-1000 group-hover:bg-white/30"></div>
          <div className="relative rounded-3xl bg-white p-10 shadow-2xl transition-transform duration-500 group-hover:scale-105">
            <img
              src="/vidhyakendra-logo.png"
              alt="VidhyaKendra"
              className="h-28 w-auto object-contain"
            />
          </div>
        </div>
        {/* Logo Container */}
{/* <div className="group relative">
  <img
    src="/vidhyakendra-logo.png"
    alt="VidhyaKendra"
    className="h-28 w-auto object-contain drop-shadow-2xl"
  />
</div> */}

        {/* Text Content */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white text-balance sm:text-5xl">
            VidhyaKendra
          </h1>
          <p className="mt-3 text-xl font-medium text-white/95">Learn • Grow • Succeed</p>
          <p className="mt-2 text-sm text-white/80">School & Coaching Management System</p>
        </div>

        {/* Loading Animation */}
        <div className="mt-8 flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white shadow-lg [animation-delay:0ms]"></div>
          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white shadow-lg [animation-delay:150ms]"></div>
          <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white shadow-lg [animation-delay:300ms]"></div>
        </div>

        {/* Version Info */}
        <p className="mt-4 text-xs text-white/70">Version 1.0.0</p>
      </div>
    </div>
  )
} 
