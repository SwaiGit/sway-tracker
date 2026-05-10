'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WeekBar from './WeekBar'
import Sidebar from './Sidebar'
import Editor from './Editor'
import HeaderWidget from './HeaderWidget'

const DASHBOARD_NAMES = ['Personal', 'SWAY']

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function startOfWeek(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

function formatKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date, days) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const dayNameFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
const shortDayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function getWeekDays(anchor = new Date()) {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return {
      key: formatKey(date),
      dayLabel: dayNameFmt.format(date),
      shortLabel: shortDayFmt.format(date),
      dateLabel: dateFmt.format(date),
      isToday: formatKey(date) === formatKey(new Date()),
    }
  })
}

function buildWeekState(dashboardName, anchor = new Date()) {
  const weekDays = getWeekDays(anchor)
  return {
    weekKey: weekDays[0].key,
    selectedDayKey: weekDays.find(d => d.isToday)?.key || weekDays[0].key,
    days: Object.fromEntries(
      weekDays.map(day => [day.key, { ...day, tasks: [] }])
    ),
  }
}

function createDashboardState(dashboardName, anchor = new Date()) {
  const week = buildWeekState(dashboardName, anchor)
  return {
    activeWeekKey: week.weekKey,
    generalTasks: [],
    sections: [
      { id: createId(), title: dashboardName === 'SWAY' ? 'Leads & New Business' : 'Things To Buy', tasks: [] },
    ],
    weeks: { [week.weekKey]: week },
  }
}

function migrateState(saved) {
  if (!saved?.dashboards) return null
  for (const name of Object.keys(saved.dashboards)) {
    const db = saved.dashboards[name]
    if (db && db.buyTasks !== undefined && !db.sections) {
      db.sections = [{ id: createId(), title: name === 'SWAY' ? 'Leads & New Business' : 'Things To Buy', tasks: db.buyTasks || [] }]
      delete db.buyTasks
    }
  }
  return saved
}

function initState() {
  const STORAGE_KEY = 'sway-tracker-state-v1'
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    const migrated = migrateState(saved)
    if (migrated) return migrated
  } catch {}
  return {
    activeDashboard: DASHBOARD_NAMES[0],
    dashboards: Object.fromEntries(
      DASHBOARD_NAMES.map(name => [name, createDashboardState(name)])
    ),
  }
}

function moveCompletedToBottom(tasks) {
  return [...tasks.filter(t => !t.complete), ...tasks.filter(t => t.complete)]
}

export default function TrackerApp({ user }) {
  const [state, setStateRaw] = useState(null)
  const [dragState, setDragState] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingGeneralId, setEditingGeneralId] = useState(null)
  const [editingSectionTask, setEditingSectionTask] = useState(null)
  const [mobileTab, setMobileTab] = useState('today')
  const router = useRouter()
  const supabase = createClient()
  const saveTimer = useRef(null)

  // Load: show localStorage immediately, then sync from Supabase
  useEffect(() => {
    const local = initState()
    setStateRaw(local)

    async function syncFromCloud() {
      if (!user?.id) return
      const { data, error } = await supabase
        .from('user_data')
        .select('state')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') return

      if (data?.state) {
        const migrated = migrateState(data.state) || data.state
        setStateRaw(migrated)
        try { localStorage.setItem('sway-tracker-state-v1', JSON.stringify(migrated)) } catch {}
      } else {
        supabase.from('user_data').upsert({ user_id: user.id, state: local, updated_at: new Date().toISOString() })
      }
    }
    syncFromCloud()
  }, [user?.id])

  // Persist: localStorage immediately + debounced Supabase upsert
  useEffect(() => {
    if (!state) return
    try { localStorage.setItem('sway-tracker-state-v1', JSON.stringify(state)) } catch {}

    if (!user?.id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      supabase.from('user_data').upsert({ user_id: user.id, state, updated_at: new Date().toISOString() })
    }, 1500)
  }, [state])

  function setState(updater) {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
  }

  // Derived helpers
  function getActiveDashboard(s) {
    return s.dashboards[s.activeDashboard]
  }

  function getActiveWeek(s) {
    const db = getActiveDashboard(s)
    return db.weeks[db.activeWeekKey]
  }

  function getSelectedDay(s) {
    const week = getActiveWeek(s)
    return week.days[week.selectedDayKey]
  }

  function getDayStats(day) {
    const total = day.tasks.length
    const completed = day.tasks.filter(t => t.complete).length
    return { total, completed, remaining: Math.max(total - completed, 0), percent: total ? Math.round((completed / total) * 100) : 0 }
  }

  function ensureWeek(s, date, selectedDayKey = null) {
    const db = getActiveDashboard(s)
    const week = buildWeekState(s.activeDashboard, date)
    if (!db.weeks[week.weekKey]) {
      db.weeks[week.weekKey] = week
    } else {
      const existingWeek = db.weeks[week.weekKey]
      const weekDays = getWeekDays(date)
      for (const day of weekDays) {
        if (!existingWeek.days[day.key]) {
          existingWeek.days[day.key] = { ...day, tasks: [] }
        } else {
          Object.assign(existingWeek.days[day.key], { dayLabel: day.dayLabel, shortLabel: day.shortLabel, dateLabel: day.dateLabel, isToday: day.isToday })
        }
      }
    }
    db.activeWeekKey = week.weekKey
    if (selectedDayKey && db.weeks[week.weekKey].days[selectedDayKey]) {
      db.weeks[week.weekKey].selectedDayKey = selectedDayKey
    }
    return db.weeks[week.weekKey]
  }

  // --- Actions ---
  function switchDashboard(name) {
    if (!DASHBOARD_NAMES.includes(name)) return
    setState(prev => {
      const next = structuredClone(prev)
      const currentWeek = getActiveWeek(next)
      const currentSelectedDayKey = currentWeek.selectedDayKey
      next.activeDashboard = name
      if (!next.dashboards[name]) {
        next.dashboards[name] = createDashboardState(name)
      }
      ensureWeek(next, dateFromKey(currentWeek.weekKey), currentSelectedDayKey)
      return next
    })
    setEditingTaskId(null); setEditingGeneralId(null); setEditingSectionTask(null)
  }

  function selectDay(key) {
    setState(prev => {
      const next = structuredClone(prev)
      getActiveWeek(next).selectedDayKey = key
      return next
    })
    setMobileTab('today')
  }

  function goWeekOffset(offset) {
    setEditingTaskId(null)
    setState(prev => {
      const next = structuredClone(prev)
      const currentWeek = getActiveWeek(next)
      const nextDate = addDays(dateFromKey(currentWeek.weekKey), offset * 7)
      ensureWeek(next, nextDate)
      return next
    })
  }

  function jumpToDate(dateVal) {
    if (!dateVal) return
    setEditingTaskId(null)
    setState(prev => {
      const next = structuredClone(prev)
      ensureWeek(next, dateFromKey(dateVal), dateVal)
      return next
    })
  }

  function addTask(text) {
    setState(prev => {
      const next = structuredClone(prev)
      const day = getSelectedDay(next)
      day.tasks.unshift({ id: createId(), text, complete: false })
      return next
    })
  }

  function toggleTask(dayKey, taskId) {
    setState(prev => {
      const next = structuredClone(prev)
      const day = getActiveWeek(next).days[dayKey]
      day.tasks = moveCompletedToBottom(day.tasks.map(t => t.id === taskId ? { ...t, complete: !t.complete } : t))
      return next
    })
  }

  function deleteTask(dayKey, taskId) {
    if (editingTaskId === taskId) setEditingTaskId(null)
    setState(prev => {
      const next = structuredClone(prev)
      const day = getActiveWeek(next).days[dayKey]
      day.tasks = day.tasks.filter(t => t.id !== taskId)
      return next
    })
  }

  function saveTaskEdit(dayKey, taskId, newText, newDateKey) {
    const trimmed = newText.trim()
    if (!trimmed) { setEditingTaskId(null); return }
    setState(prev => {
      const next = structuredClone(prev)
      const db = getActiveDashboard(next)
      const currentWeek = getActiveWeek(next)
      const sourceDay = currentWeek.days[dayKey]
      const taskIndex = sourceDay.tasks.findIndex(t => t.id === taskId)
      if (taskIndex === -1) return next
      const sanitizedDate = newDateKey || dayKey
      const targetWeek = ensureWeek(next, dateFromKey(sanitizedDate), sanitizedDate)
      const updatedTask = { ...sourceDay.tasks[taskIndex], text: trimmed }
      sourceDay.tasks.splice(taskIndex, 1)
      targetWeek.days[sanitizedDate].tasks = moveCompletedToBottom([updatedTask, ...targetWeek.days[sanitizedDate].tasks])
      db.activeWeekKey = targetWeek.weekKey
      targetWeek.selectedDayKey = sanitizedDate
      return next
    })
    setEditingTaskId(null)
  }

  function resetDay() {
    setState(prev => {
      const next = structuredClone(prev)
      const day = getSelectedDay(next)
      day.tasks = []
      return next
    })
  }

  // General tasks
  function addGeneralTask(text) {
    setState(prev => {
      const next = structuredClone(prev)
      getActiveDashboard(next).generalTasks.unshift({ id: createId(), text, complete: false })
      return next
    })
  }

  function toggleGeneralTask(id) {
    setState(prev => {
      const next = structuredClone(prev)
      const db = getActiveDashboard(next)
      db.generalTasks = moveCompletedToBottom(db.generalTasks.map(t => t.id === id ? { ...t, complete: !t.complete } : t))
      return next
    })
  }

  function deleteGeneralTask(id) {
    if (editingGeneralId === id) setEditingGeneralId(null)
    setState(prev => {
      const next = structuredClone(prev)
      getActiveDashboard(next).generalTasks = getActiveDashboard(next).generalTasks.filter(t => t.id !== id)
      return next
    })
  }

  function saveGeneralEdit(id, text) {
    const trimmed = text.trim()
    if (!trimmed) { setEditingGeneralId(null); return }
    setState(prev => {
      const next = structuredClone(prev)
      const db = getActiveDashboard(next)
      db.generalTasks = db.generalTasks.map(t => t.id === id ? { ...t, text: trimmed } : t)
      return next
    })
    setEditingGeneralId(null)
  }

  // Sections
  function addSection() {
    setState(prev => {
      const next = structuredClone(prev)
      const db = getActiveDashboard(next)
      db.sections = [...(db.sections || []), { id: createId(), title: 'New Section', tasks: [] }]
      return next
    })
  }

  function renameSection(sectionId, newTitle) {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    setState(prev => {
      const next = structuredClone(prev)
      const section = getActiveDashboard(next).sections?.find(s => s.id === sectionId)
      if (section) section.title = trimmed
      return next
    })
  }

  function deleteSection(sectionId) {
    setState(prev => {
      const next = structuredClone(prev)
      const db = getActiveDashboard(next)
      db.sections = (db.sections || []).filter(s => s.id !== sectionId)
      return next
    })
  }

  function addSectionTask(sectionId, text) {
    setState(prev => {
      const next = structuredClone(prev)
      const section = getActiveDashboard(next).sections?.find(s => s.id === sectionId)
      if (section) section.tasks.unshift({ id: createId(), text, complete: false })
      return next
    })
  }

  function toggleSectionTask(sectionId, taskId) {
    setState(prev => {
      const next = structuredClone(prev)
      const section = getActiveDashboard(next).sections?.find(s => s.id === sectionId)
      if (section) section.tasks = moveCompletedToBottom(section.tasks.map(t => t.id === taskId ? { ...t, complete: !t.complete } : t))
      return next
    })
  }

  function deleteSectionTask(sectionId, taskId) {
    if (editingSectionTask?.taskId === taskId) setEditingSectionTask(null)
    setState(prev => {
      const next = structuredClone(prev)
      const section = getActiveDashboard(next).sections?.find(s => s.id === sectionId)
      if (section) section.tasks = section.tasks.filter(t => t.id !== taskId)
      return next
    })
  }

  function saveSectionTaskEdit(sectionId, taskId, text) {
    const trimmed = text.trim()
    if (!trimmed) { setEditingSectionTask(null); return }
    setState(prev => {
      const next = structuredClone(prev)
      const section = getActiveDashboard(next).sections?.find(s => s.id === sectionId)
      if (section) section.tasks = section.tasks.map(t => t.id === taskId ? { ...t, text: trimmed } : t)
      return next
    })
    setEditingSectionTask(null)
  }

  // Drag and drop
  function moveTaskToDay(targetDayKey, taskId, sourceKind, sourceDayKey, sourceSectionId) {
    setState(prev => {
      const next = structuredClone(prev)
      const week = getActiveWeek(next)
      const db = getActiveDashboard(next)
      let task = null

      if (sourceKind === 'general') {
        const idx = db.generalTasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = db.generalTasks.splice(idx, 1)
      } else if (sourceKind === 'section') {
        const section = (db.sections || []).find(s => s.id === sourceSectionId)
        if (!section) return next
        const idx = section.tasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = section.tasks.splice(idx, 1)
      } else {
        if (sourceDayKey === targetDayKey) return next
        const sourceDay = week.days[sourceDayKey]
        const idx = sourceDay.tasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = sourceDay.tasks.splice(idx, 1)
      }

      week.days[targetDayKey].tasks.unshift(task)
      week.selectedDayKey = targetDayKey
      return next
    })
  }

  function moveTaskToGeneral(sourceDayKey, taskId, sourceKind, sourceSectionId) {
    setState(prev => {
      const next = structuredClone(prev)
      const week = getActiveWeek(next)
      const db = getActiveDashboard(next)
      let task = null

      if (sourceKind === 'section') {
        const section = (db.sections || []).find(s => s.id === sourceSectionId)
        if (!section) return next
        const idx = section.tasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = section.tasks.splice(idx, 1)
      } else {
        const sourceDay = week.days[sourceDayKey]
        const idx = sourceDay.tasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = sourceDay.tasks.splice(idx, 1)
      }

      db.generalTasks.unshift(task)
      return next
    })
  }

  function moveTaskToSection(targetSectionId, sourceKind, sourceDayKey, taskId, sourceSectionId) {
    setState(prev => {
      const next = structuredClone(prev)
      const week = getActiveWeek(next)
      const db = getActiveDashboard(next)
      const targetSection = (db.sections || []).find(s => s.id === targetSectionId)
      if (!targetSection) return next
      let task = null

      if (sourceKind === 'general') {
        const idx = db.generalTasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = db.generalTasks.splice(idx, 1)
      } else if (sourceKind === 'section') {
        if (sourceSectionId === targetSectionId) return next
        const sourceSection = (db.sections || []).find(s => s.id === sourceSectionId)
        if (!sourceSection) return next
        const idx = sourceSection.tasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = sourceSection.tasks.splice(idx, 1)
      } else {
        const sourceDay = week.days[sourceDayKey]
        const idx = sourceDay.tasks.findIndex(t => t.id === taskId)
        if (idx === -1) return next
        ;[task] = sourceDay.tasks.splice(idx, 1)
      }

      targetSection.tasks.unshift(task)
      return next
    })
  }

  function reorderTask(dayKey, taskId, targetTaskId) {
    if (taskId === targetTaskId) return
    setState(prev => {
      const next = structuredClone(prev)
      const day = getActiveWeek(next).days[dayKey]
      const srcIdx = day.tasks.findIndex(t => t.id === taskId)
      const tgtIdx = day.tasks.findIndex(t => t.id === targetTaskId)
      if (srcIdx === -1 || tgtIdx === -1) return next
      const [task] = day.tasks.splice(srcIdx, 1)
      const insertIdx = srcIdx < tgtIdx ? tgtIdx - 1 : tgtIdx
      day.tasks.splice(insertIdx, 0, task)
      return next
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Lifetime stats
  function getLifetimeStats(s) {
    const db = getActiveDashboard(s)
    const allDays = Object.values(db.weeks).flatMap(w => Object.values(w.days))
    const dayTotal = allDays.reduce((sum, d) => sum + d.tasks.length, 0)
    const dayCompleted = allDays.reduce((sum, d) => sum + d.tasks.filter(t => t.complete).length, 0)
    const genTotal = db.generalTasks.length
    const genCompleted = db.generalTasks.filter(t => t.complete).length
    const secTotal = (db.sections || []).reduce((sum, s) => sum + s.tasks.length, 0)
    const secCompleted = (db.sections || []).reduce((sum, s) => sum + s.tasks.filter(t => t.complete).length, 0)
    const total = dayTotal + genTotal + secTotal
    const completed = dayCompleted + genCompleted + secCompleted
    return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 }
  }

  if (!state) {
    return (
      <div className="loading-screen">
        <div className="loading-dot" />
      </div>
    )
  }

  const dashboard = getActiveDashboard(state)
  const week = getActiveWeek(state)
  const selectedDay = getSelectedDay(state)
  const dayStats = getDayStats(selectedDay)
  const lifetimeStats = getLifetimeStats(state)
  const weekDays = getWeekDays(dateFromKey(week.weekKey))

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="app-bg" data-dashboard={state.activeDashboard}>
      <div className="shell">
        {/* Header */}
        <header className="app-header">
          <div className="header-inner">
            <div className="header-left">
              <div className="header-brand">
                <div>
                  <span className="eyebrow">Weekly Workflow</span>
                  <h1 className="header-title">Task Tracker</h1>
                </div>
                <div className="header-user">
                  <div className="user-avatar" title={displayName}>{initials}</div>
                  <button className="sign-out-btn" onClick={signOut}>Sign out</button>
                </div>
              </div>
              <div className="dashboard-switcher">
                {DASHBOARD_NAMES.map(name => (
                  <button
                    key={name}
                    className={`dashboard-tab${state.activeDashboard === name ? ' active' : ''}`}
                    onClick={() => switchDashboard(name)}
                    type="button"
                  >
                    {name === 'SWAY' ? 'Professional' : name}
                  </button>
                ))}
              </div>
            </div>

            <div className="header-right">
              {/* Stats ring */}
              <div className="header-stats">
                <div className="stat-ring-wrap">
                  <svg className="stat-ring" viewBox="0 0 96 96" aria-hidden="true">
                    <circle className="ring-track" cx="48" cy="48" r="42" />
                    <circle
                      className="ring-fill"
                      cx="48" cy="48" r="42"
                      style={{
                        strokeDashoffset: 263.9 - (dayStats.percent / 100) * 263.9,
                        stroke: dayStats.percent === 100 && dayStats.total > 0 ? 'var(--success)' : 'var(--gold)',
                      }}
                    />
                  </svg>
                  <div className="ring-label">
                    <span className="ring-pct">{dayStats.percent}%</span>
                    <span className="ring-caption">{dayStats.total ? 'done' : 'no tasks'}</span>
                  </div>
                </div>
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-label">Selected day</span>
                    <span className="stat-value">{selectedDay.dayLabel}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Completed</span>
                    <span className="stat-value">{dayStats.completed}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Remaining</span>
                    <span className="stat-value">{dayStats.remaining}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total tasks</span>
                    <span className="stat-value">{dayStats.total}</span>
                  </div>
                </div>
              </div>

              <HeaderWidget />
            </div>
          </div>
        </header>

        {/* Week bar */}
        <WeekBar
          week={week}
          weekDays={weekDays}
          onPrev={() => goWeekOffset(-1)}
          onNext={() => goWeekOffset(1)}
          onJump={jumpToDate}
          onSelectDay={selectDay}
          getDayStats={getDayStats}
          dragState={dragState}
          onDropToDay={(dayKey) => {
            if (!dragState) return
            moveTaskToDay(dayKey, dragState.taskId, dragState.sourceKind, dragState.sourceDayKey, dragState.sectionId)
            setDragState(null)
          }}
        />

        {/* Content */}
        <div className={`content mobile-tab-${mobileTab}`}>
          <Sidebar
            dashboard={dashboard}
            lifetimeStats={lifetimeStats}
            editingGeneralId={editingGeneralId}
            editingSectionTask={editingSectionTask}
            dragState={dragState}
            setDragState={setDragState}
            onAddGeneral={addGeneralTask}
            onToggleGeneral={toggleGeneralTask}
            onDeleteGeneral={deleteGeneralTask}
            onEditGeneral={(id) => setEditingGeneralId(id)}
            onSaveGeneralEdit={saveGeneralEdit}
            onCancelGeneralEdit={() => setEditingGeneralId(null)}
            onAddSection={addSection}
            onRenameSection={renameSection}
            onDeleteSection={deleteSection}
            onAddSectionTask={addSectionTask}
            onToggleSectionTask={toggleSectionTask}
            onDeleteSectionTask={deleteSectionTask}
            onEditSectionTask={(sectionId, taskId) => setEditingSectionTask({ sectionId, taskId })}
            onSaveSectionTaskEdit={saveSectionTaskEdit}
            onCancelSectionTaskEdit={() => setEditingSectionTask(null)}
            onDropToGeneral={(sourceKind, sourceDayKey, taskId, sourceSectionId) => {
              moveTaskToGeneral(sourceDayKey, taskId, sourceKind, sourceSectionId)
              setDragState(null)
            }}
            onDropToSection={(targetSectionId, sourceKind, sourceDayKey, taskId, sourceSectionId) => {
              moveTaskToSection(targetSectionId, sourceKind, sourceDayKey, taskId, sourceSectionId)
              setDragState(null)
            }}
          />

          <Editor
            selectedDay={selectedDay}
            activeDashboard={state.activeDashboard}
            dayStats={dayStats}
            editingTaskId={editingTaskId}
            dragState={dragState}
            setDragState={setDragState}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onEditTask={(id) => setEditingTaskId(id)}
            onSaveEdit={saveTaskEdit}
            onCancelEdit={() => setEditingTaskId(null)}
            onReorder={reorderTask}
            onReset={resetDay}
            onDropToDay={(dayKey, taskId, sourceKind, sourceDayKey) => {
              moveTaskToDay(dayKey, taskId, sourceKind, sourceDayKey)
              setDragState(null)
            }}
          />
        </div>

        {/* Mobile bottom tab bar */}
        <nav className="mobile-tabs" aria-label="View switcher">
          <button
            className={`mobile-tab${mobileTab === 'today' ? ' active' : ''}`}
            onClick={() => setMobileTab('today')}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Today
          </button>
          <button
            className={`mobile-tab${mobileTab === 'lists' ? ' active' : ''}`}
            onClick={() => setMobileTab('lists')}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 6h12M4 10h12M4 14h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Lists
          </button>
        </nav>
      </div>
    </div>
  )
}
