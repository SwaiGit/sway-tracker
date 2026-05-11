'use client'

import { useRef } from 'react'

export default function WeekBar({ week, weekDays, onPrev, onNext, onJump, onToday, onSelectDay, getDayStats, dragState, onDropToDay, dayStats, selectedDay }) {
  const dateInputRef = useRef(null)

  const firstDay = weekDays[0]
  const lastDay = weekDays[6]

  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  const rangeLabel = `${fmt.format(new Date(firstDay.key + 'T00:00:00'))} – ${fmt.format(new Date(lastDay.key + 'T00:00:00'))}`

  return (
    <section className="week-bar" aria-label="Week navigation">
      <button className="week-nav" onClick={onPrev} aria-label="Previous week" type="button">‹</button>

      <div className="week-center">
        <div className="week-bar-top">
          <span className="week-range">{rangeLabel}</span>
          <div className="week-bar-actions">
            <button className="today-btn" type="button" onClick={onToday}>Today</button>
            <label
              className="cal-btn"
              aria-label="Jump to date"
              style={{ position: 'relative' }}
              onClick={e => {
                if (dateInputRef.current?.showPicker) {
                  e.preventDefault()
                  dateInputRef.current.showPicker()
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5" width="16" height="15" rx="2"/>
                <path d="M8 3v4M16 3v4M4 10h16"/>
              </svg>
              <input
                ref={dateInputRef}
                type="date"
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                value={week.selectedDayKey}
                onChange={e => onJump(e.target.value)}
                aria-label="Choose a date"
              />
            </label>
          </div>
        </div>

        <div className="week-strip">
          {weekDays.map(day => {
            const dayData = week.days[day.key]
            const stats = dayData ? getDayStats(dayData) : { total: 0, completed: 0, percent: 0 }
            const isActive = day.key === week.selectedDayKey
            const isToday = day.isToday

            return (
              <button
                key={day.key}
                type="button"
                className={`day-pill${isActive ? ' active' : ''}${isToday ? ' today' : ''}`}
                onClick={() => onSelectDay(day.key)}
                onDragOver={e => { if (dragState) { e.preventDefault() } }}
                onDrop={e => { e.preventDefault(); onDropToDay(day.key) }}
                aria-label={`${day.dayLabel} ${day.dateLabel}${isToday ? ', today' : ''}${isActive ? ', selected' : ''}`}
              >
                <div className="day-top">
                  <span className="day-name">{day.shortLabel}</span>
                  <span className="day-date">{day.dateLabel}</span>
                </div>
                <div className="mini-bar">
                  <div className="mini-bar-fill" style={{ width: `${stats.percent}%` }} />
                </div>
                <div className="day-meta">
                  <span>{stats.completed}/{stats.total} done</span>
                  <span>{stats.percent}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <button className="week-nav" onClick={onNext} aria-label="Next week" type="button">›</button>

      {/* Mobile-only day stats strip */}
      {dayStats && selectedDay && (
        <div className="mobile-day-stats">
          <div className="mobile-ring-wrap">
            <svg className="mobile-ring" viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                style={{
                  stroke: dayStats.percent === 100 && dayStats.total > 0 ? '#1b6c52' : '#f27f78',
                  strokeDasharray: 138.2,
                  strokeDashoffset: 138.2 - (dayStats.percent / 100) * 138.2,
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                  transition: 'stroke-dashoffset 0.4s ease',
                }}
              />
            </svg>
            <span className="mobile-ring-pct">{dayStats.percent}%</span>
          </div>
          <div className="mobile-day-stat-items">
            <div className="mobile-stat-row"><span className="mobile-stat-label">Day</span><span className="mobile-stat-value">{selectedDay.dayLabel}</span></div>
            <div className="mobile-stat-row"><span className="mobile-stat-label">Done</span><span className="mobile-stat-value">{dayStats.completed}</span></div>
            <div className="mobile-stat-row"><span className="mobile-stat-label">Left</span><span className="mobile-stat-value">{dayStats.remaining}</span></div>
            <div className="mobile-stat-row"><span className="mobile-stat-label">Total</span><span className="mobile-stat-value">{dayStats.total}</span></div>
          </div>
        </div>
      )}
    </section>
  )
}
