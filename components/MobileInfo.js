'use client'

import { useState, useEffect } from 'react'

const WEATHER_CODES = {
  0:'Clear', 1:'Mostly clear', 2:'Partly cloudy', 3:'Cloudy',
  45:'Fog', 48:'Fog', 51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain',
  71:'Light snow', 73:'Snow', 75:'Heavy snow',
  80:'Showers', 81:'Showers', 82:'Heavy showers',
  95:'Thunderstorm', 96:'Thunderstorm', 99:'Thunderstorm',
}

export default function MobileInfo() {
  const [time, setTime] = useState('')
  const [weather, setWeather] = useState('')

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`
        )
        if (!r.ok) throw new Error()
        const data = await r.json()
        const { temperature_2m, weather_code } = data.current
        setWeather(`${Math.round(temperature_2m)}°C · ${WEATHER_CODES[weather_code] || ''}`)
      } catch {}
    }, () => {})
  }, [])

  if (!time) return null

  return (
    <div className="mobile-info">
      <span className="mobile-info-time">{time}</span>
      {weather && <span className="mobile-info-weather">{weather}</span>}
    </div>
  )
}
