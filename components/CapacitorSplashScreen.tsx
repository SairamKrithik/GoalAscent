'use client'

import { useEffect } from 'react'

export function CapacitorSplashScreen() {
  useEffect(() => {
    // Only run if we are inside Capacitor native app
    const hideSplash = async () => {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
      } catch (err) {
        // Not running in Capacitor (just web), ignore silently
      }
    }
    
    hideSplash()
  }, [])
  
  return null
}
