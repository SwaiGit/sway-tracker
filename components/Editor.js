'use client'

import { useRef, useEffect, useState } from 'react'

function TaskItem({ task, dayKey, isEditing, onToggle, onDelete, onEdit, onSave, onCancel, onDragStart, onDragEnd, onDragOver, onDrop }) {
  const inputRef = useRef(null)
  const dateRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function handleSave() {
    onSave(dayKey, task.id, inputRef.current?.value || task.text, dateRef.current?.value || dayKey)
  }

  return (
    <li
      className={`main-task-item${task.complete ? ' complete' : ''}`}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-task-id={task.id}
    >
      <input
        className="cb cb-lg"
        type="checkbox"
        checked={task.complete}
        onChange={onToggle}
        aria-label={`Mark ${task.text} complete`}
      />

      {isEditing ? (
        <div className="edit-fields">
          <input
            ref={inputRef}
            className="edit-input-main"
            type="text"
            defaultValue={task.text}
            maxLength={120}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleSave() }
              if (e.key === 'Escape') onCancel()
            }}
          />
          <input
            ref={dateRef}
            className="edit-date-input"
            type="date"
            defaultValue={dayKey}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleSave() }
              if (e.key === 'Escape') onCancel()
            }}
          />
        </div>
      ) : (
        <span className="task-text-main">{task.text}</span>
      )}

      <button
        className="task-edit-btn"
        type="button"
        onClick={() => isEditing ? handleSave() : onEdit(task.id)}
        aria-label={isEditing ? `Save ${task.text}` : `Edit ${task.text}`}
        title={isEditing ? 'Save' : 'Edit'}
      >
        {isEditing ? '✓' : '✎'}
      </button>

      <button className="task-del" type="button" onClick={onDelete} aria-label={`Delete ${task.text}`} style={{ width: 34, height: 34 }}>×</button>
    </li>
  )
}

export default function Editor({
  selectedDay, activeDashboard, dayStats, editingTaskId,
  dragState, setDragState,
  onAddTask, onToggleTask, onDeleteTask, onEditTask, onSaveEdit, onCancelEdit,
  onReorder, onReset, onDropToDay,
}) {
  const inputRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    const val = inputRef.current?.value.trim()
    if (!val) { inputRef.current?.focus(); return }
    onAddTask(val)
    inputRef.current.value = ''
    inputRef.current.focus()
  }

  function listDragOver(e) {
    if (!dragState) return
    const isDiffDay = dragState.sourceKind === 'day' && dragState.sourceDayKey !== selectedDay.key
    const isSidebar = dragState.sourceKind === 'general' || dragState.sourceKind === 'buy'
    if (!isDiffDay && !isSidebar) return
    e.preventDefault()
  }

  function listDrop(e) {
    if (!dragState) return
    const isDiffDay = dragState.sourceKind === 'day' && dragState.sourceDayKey !== selectedDay.key
    const isSidebar = dragState.sourceKind === 'general' || dragState.sourceKind === 'buy'
    if (!isDiffDay && !isSidebar) return
    e.preventDefault()
    onDropToDay(selectedDay.key, dragState.taskId, dragState.sourceKind, dragState.sourceDayKey)
  }

  const isAllDone = dayStats.percent === 100 && dayStats.total > 0

  return (
    <section className="editor">
      <div className="editor-toolbar">
        <div>
          <h2 className="editor-title">{activeDashboard === 'SWAY' ? 'Professional' : activeDashboard} · {selectedDay.dayLabel} Tasks</h2>
          <p className="editor-sub">{selectedDay.dateLabel}</p>
        </div>
      </div>

      {isAllDone && (
        <div className="complete-banner visible">
          🎉 All tasks for this day are complete. The ring is fully closed.
        </div>
      )}

      <ul
        className="main-task-list"
        onDragOver={listDragOver}
        onDrop={listDrop}
      >
        {selectedDay.tasks.length === 0 ? (
          <li className={`empty-state${dragState ? ' drop-target' : ''}`}>
            No tasks yet for this day. Add one below or drag a task here.
          </li>
        ) : (
          selectedDay.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              dayKey={selectedDay.key}
              isEditing={editingTaskId === task.id}
              onToggle={() => onToggleTask(selectedDay.key, task.id)}
              onDelete={() => onDeleteTask(selectedDay.key, task.id)}
              onEdit={onEditTask}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
              onDragStart={e => {
                if (editingTaskId === task.id) { e.preventDefault(); return }
                setDragState({ sourceKind: 'day', sourceDayKey: selectedDay.key, taskId: task.id })
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', task.id)
              }}
              onDragEnd={() => setDragState(null)}
              onDragOver={e => {
                if (dragState?.sourceKind !== 'day' || dragState.sourceDayKey !== selectedDay.key || dragState.taskId === task.id) return
                e.preventDefault()
              }}
              onDrop={e => {
                e.preventDefault()
                if (dragState?.sourceKind !== 'day' || dragState.sourceDayKey !== selectedDay.key || dragState.taskId === task.id) return
                onReorder(selectedDay.key, dragState.taskId, task.id)
                setDragState(null)
              }}
            />
          ))
        )}
      </ul>

      <form className="main-add-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="main-add-input"
          type="text"
          placeholder={`Add a task for ${selectedDay.dayLabel}`}
          maxLength={120}
          autoComplete="off"
        />
        <button className="main-add-btn" type="submit">Add Task</button>
      </form>

      <button className="reset-btn" onClick={onReset} type="button">↺ Reset</button>
    </section>
  )
}
