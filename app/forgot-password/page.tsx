'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { adminApi } from '@/lib/api/admin'

type Step = 'email' | 'otp' | 'password' | 'success'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [emailOrMobile, setEmailOrMobile] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [apiError, setApiError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)

const handleSendOTP = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setApiError(null)
  try {
    const res = await adminApi.requestOtp({ email: emailOrMobile })
    if (res.success) {
      setStep('otp')
      startCountdown()
    } else {
      setApiError(res.message || 'Failed to send OTP. Please try again.')
    }
  } catch {
    setApiError('Network error. Please try again.')
  } finally {
    setIsLoading(false)
  }
}

  const startCountdown = () => {
    setCountdown(30)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

const handleVerifyOTP = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setApiError(null)
  try {
    const res = await adminApi.verifyOtp({ email: emailOrMobile, otp: otp.join('') })
    if (res.success) {
      setStep('password')
    } else {
      setApiError(res.message || 'Invalid OTP. Please try again.')
    }
  } catch {
    setApiError('Network error. Please try again.')
  } finally {
    setIsLoading(false)
  }
}

const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault()
  if (newPassword !== confirmPassword) {
    setApiError('Passwords do not match!')
    return
  }
  setIsLoading(true)
  setApiError(null)
  try {
    const res = await adminApi.resetPassword({ email: emailOrMobile, otp: otp.join(''), new_password: newPassword })
    if (res.success) {
      setStep('success')
    } else {
      setApiError(res.message || 'Failed to reset password. Please try again.')
    }
  } catch {
    setApiError('Network error. Please try again.')
  } finally {
    setIsLoading(false)
  }
}

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOTP = [...otp]
    newOTP[index] = value
    setOtp(newOTP)
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img
            src="/Vidhyakendra-Logo.png"
            alt="VidhyaKendra"
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* Reset Password Card */}
        <Card className="border-border shadow-lg">
          {step === 'email' && (
            <>
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
                <CardDescription>
                  Enter your email or mobile number to receive an OTP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="emailOrMobile">Email or Mobile Number</Label>
                    <Input
                      id="emailOrMobile"
                      type="text"
                      placeholder="admin@institute.com"
                      value={emailOrMobile}
                      onChange={(e) => setEmailOrMobile(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
              {apiError && (
  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
    {apiError}
  </div>
)}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-primary hover:bg-primary/90"
                  >
                    Send OTP
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {step === 'otp' && (
            <>
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl font-bold">Verify OTP</CardTitle>
                <CardDescription>
                  Enter the 6-digit code sent to {emailOrMobile}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Enter OTP</Label>
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, index) => (
                        <Input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOTPChange(index, e.target.value)}
                          onKeyDown={(e) => handleOTPKeyDown(index, e)}
                          className="h-12 w-12 text-center text-lg font-semibold"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-center text-sm">
                    {countdown > 0 ? (
                      <p className="text-muted-foreground">
                        Resend OTP in {countdown}s
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleSendOTP(new Event('submit') as any)
                        }}
                        className="text-primary hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
{apiError && (
  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
    {apiError}
  </div>
)}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-primary hover:bg-primary/90"
                  >
                    Verify OTP
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setStep('email')}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change Email/Mobile
                  </button>
                </div>
              </CardContent>
            </>
          )}

          {step === 'password' && (
            <>
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
                <CardDescription>
                  Enter your new password below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
{apiError && (
  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
    {apiError}
  </div>
)}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-primary hover:bg-primary/90"
                  >
                    Reset Password
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 'success' && (
            <>
              <CardHeader className="space-y-2 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
                <CardDescription>
                  Your password has been reset successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login">
                  <Button className="w-full h-11 bg-primary hover:bg-primary/90">
                    Go to Login
                  </Button>
                </Link>
              </CardContent>
            </>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © 2024 VidhyaKendra. All rights reserved.
        </p>
      </div>
    </div>
  )
}
