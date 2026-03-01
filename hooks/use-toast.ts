"use client"

import * as React from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToastProps = {
  id?: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const toast = React.useCallback(({ title, description, variant = "default", ...props }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    
    setToasts((prev) => {
      const newToasts = [{ id, title, description, variant, ...props }, ...prev]
      return newToasts.slice(0, TOAST_LIMIT)
    })

    // Remove o toast automaticamente após o delay
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_REMOVE_DELAY)

    return id
  }, [])

  const dismiss = React.useCallback((toastId?: string) => {
    setToasts((prev) => {
      if (toastId) return prev.filter((t) => t.id !== toastId)
      return []
    })
  }, [])

  return {
    toast,
    toasts,
    dismiss,
  }
}