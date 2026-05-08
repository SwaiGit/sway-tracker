'use client'

import { useState, useEffect } from 'react'

const WEATHER_CODES = {
  0:'Clear', 1:'Mostly clear', 2:'Partly cloudy', 3:'Cloudy',
  45:'Fog', 48:'Fog', 51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain',
  71:'Light snow', 73:'Snow', 75:'Heavy snow',
  80:'Rain showers', 81:'Rain showers', 82:'Heavy showers',
  95:'Thunderstorm', 96:'Storm & hail', 99:'Storm & hail',
}

const CLOCKS = [
  { label: 'Hong Kong', tz: 'Asia/Hong_Kong' },
  { label: 'New York', tz: 'America/New_York' },
  { label: 'Los Angeles', tz: 'America/Los_Angeles' },
  { label: 'Calgary', tz: 'America/Edmonton' },
]

const timeFmt = tz => new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz })

export default function HeaderWidget() {
  const [weather, setWeather] = useState('Loading…')
  const [times, setTimes] = useState({})

  function updateTimes() {
    const now = new Date()
    const t = {}
    for (const c of CLOCKS) t[c.tz] = timeFmt(c.tz).format(now)
    setTimes(t)
  }

  useEffect(() => {
    updateTimes()
    const interval = setInterval(updateTimes, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.0447&longitude=-114.0719&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=America%2FEdmonton')
        if (!r.ok) throw new Error()
        const data = await r.json()
        const { temperature_2m, weather_code } = data.current
        setWeather(`${Math.round(temperature_2m)}°C · ${WEATHER_CODES[weather_code] || 'Weather'}`)
      } catch {
        setWeather('Unavailable')
      }
    }
    load()
    const interval = setInterval(load, 10 * 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="header-widget" aria-label="Weather and world clocks">
      <div className="widget-row">
        <span className="weather-dot" aria-hidden="true" />
        <div>
          <span className="widget-label">Calgary Weather</span>
          <span className="widget-value">{weather}</span>
        </div>
      </div>
      <div className="clock-list">
        {CLOCKS.map(c => (
          <div key={c.tz} className="clock-row">
            <span className="widget-label">{c.label}</span>
            <span className="clock-time">{times[c.tz] || '--:--'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
