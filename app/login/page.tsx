'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { adminApi,  LOCAL_STORAGE_KEYS } from '@/lib/api/admin'
import type { LoginResponse, InstituteRef } from '@/lib/api/admin'
import { BASE_URL } from '@/lib/api/config'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await adminApi.login({ email, password })

      if (!res.success || !res.result) {
        setError(res.message || 'Invalid credentials. Please try again.')
        setIsLoading(false)
        return
      }

      const { admin, token, institute_type } = res.result as LoginResponse

      // ── institute_id must be populated object (backend always populates it in verifyLogin)
      const instituteRef = admin.institute_id as InstituteRef

      // ── Guard: institute_id should be populated; if not, something is wrong
      if (!instituteRef || typeof instituteRef !== 'object' || !instituteRef._id) {
        setError('Login failed: Institute information is missing. Please contact support.')
        setIsLoading(false)
        return
      }

     // ── admin_type permission check ───────────────────────────────────────
      // Only 'coaching' admin_type is allowed to access this portal
      if (admin.admin_type !== 'coaching') {
        setError(
          `Access denied. This portal is only accessible to coaching admins.`
        )
        setIsLoading(false)
        return
      }

      // ── Save to localStorage ──────────────────────────────────────────────
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token)
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ID, admin._id)
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_NAME, admin.name)
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_EMAIL, admin.email)
      localStorage.setItem(LOCAL_STORAGE_KEYS.ROLE, 'institute_admin')

      // admin_type: store as-is from backend ('school', 'coaching', or null)
      // Used later for feature-gating (e.g. show school-only vs coaching-only modules)
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.ADMIN_TYPE,
        admin.admin_type ?? ''
      )

      // Institute details from populated institute_id object
      localStorage.setItem(LOCAL_STORAGE_KEYS.INSTITUTE_ID, instituteRef._id)
      localStorage.setItem(LOCAL_STORAGE_KEYS.INSTITUTE_NAME, instituteRef.institute_name)
      localStorage.setItem(LOCAL_STORAGE_KEYS.INSTITUTE_CODE, instituteRef.institute_code)

      // institute_type: use from response (source of truth = backend)
      // Can be 'school', 'coaching', or 'both'
      localStorage.setItem(LOCAL_STORAGE_KEYS.INSTITUTE_TYPE, institute_type)

      // ── Fetch institute logo (non-blocking) ───────────────────────────────
      try {
        const docsRes = await fetch(
          `${BASE_URL}/institute-documents/institute/${instituteRef._id}`,
          { headers: { Authorization: `Bearer ${token}` } } 
        )
        const docsData = await docsRes.json()

        if (docsData.success && Array.isArray(docsData.result)) {
          const logoDoc = docsData.result.find(
            (d: { document_type: string; file_url?: string }) =>
              d.document_type === 'logo'
          )
          if (logoDoc?.file_url) {
            localStorage.setItem(
            LOCAL_STORAGE_KEYS.INSTITUTE_LOGO,
            `${BASE_URL}${logoDoc.file_url}`
          )
          }
        }
      } catch {
        // Logo fetch failure should not block login
      }

      router.push('/dashboard')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1897C6] to-[#67BAC3] p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 h-64 w-64 animate-pulse rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-10 right-10 h-64 w-64 animate-pulse rounded-full bg-white blur-3xl [animation-delay:1s]"></div>
        </div>
        <div className="relative z-10">
          <img
            src="/Vidhyakendra-Logo.png"
            alt="VidhyaKendra"
            className="h-16 w-auto object-contain brightness-0 invert drop-shadow-lg"
          />
        </div>
        <div className="relative z-10 text-white">
          <h1 className="text-5xl font-bold mb-6 text-balance leading-tight">
            Streamline Your Institute Management
          </h1>
          <p className="text-xl text-white/90 leading-relaxed">
            Manage students, teachers, attendance, and everything in between with our
            comprehensive admin panel.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">1000+</div>
              <div className="text-sm text-white/80">Active Students</div>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">50+</div>
              <div className="text-sm text-white/80">Expert Teachers</div>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-white/80 text-sm font-medium">
          Learn • Grow • Succeed
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <img
              src="/Vidhyakendra-Logo.png" 
              alt="VidhyaKendra"
              className="h-14 w-auto object-contain"
            />
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-2 text-center pb-8">
              <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
              <CardDescription className="text-base">
                Enter your credentials to access admin panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@institute.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Need help?{' '}
                <Link href="/support" className="text-primary hover:underline">
                  Contact Support
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2024 VidhyaKendra. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}