'use client'

import { useRef, useEffect, useState } from 'react'

function TaskItem({ task, isEditing, onToggle, onDelete, onEdit, onSave, onCancel, onDragStart, onDragEnd }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  return (
    <li
      className={`task-item${task.complete ? ' complete' : ''}`}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-task-id={task.id}
    >
      <input
        className="cb"
        type="checkbox"
        checked={task.complete}
        onChange={onToggle}
        aria-label={`Mark ${task.text} complete`}
      />

      {isEditing ? (
        <input
          ref={inputRef}
          className="edit-input"
          type="text"
          defaultValue={task.text}
          maxLength={120}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onSave(inputRef.current.value) }
            if (e.key === 'Escape') onCancel()
          }}
          onBlur={() => onSave(inputRef.current.value)}
        />
      ) : (
        <span className="task-text" onDoubleClick={() => onEdit(task.id)}>{task.text}</span>
      )}

      <button className="task-del" type="button" onClick={onDelete} aria-label={`Delete ${task.text}`}>×</button>
    </li>
  )
}

function AddForm({ placeholder, onAdd, textareaRef }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const val = e.target.value.trim()
      if (val) { onAdd(val); e.target.value = ''; autosize(e.target) }
    }
  }

  function autosize(el) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  return (
    <div className="add-form">
      <textarea
        ref={textareaRef}
        className="add-textarea"
        placeholder={placeholder}
        maxLength={120}
        rows={1}
        onInput={e => autosize(e.target)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="add-btn-small"
        type="button"
        onClick={() => {
          const el = textareaRef?.current
          if (!el) return
          const val = el.value.trim()
          if (val) { onAdd(val); el.value = ''; el.style.height = 'auto' }
        }}
      >Add</button>
    </div>
  )
}

function SectionBlock({
  section, editingSectionTask, dragState, setDragState,
  onRename, onDelete,
  onAddTask, onToggleTask, onDeleteTask, onEditTask, onSaveTaskEdit, onCancelTaskEdit,
  onDropToSection,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(section.title)
  const titleInputRef = useRef(null)
  const addRef = useRef(null)

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  function commitTitle() {
    const trimmed = titleVal.trim()
    if (trimmed && trimmed !== section.title) onRename(trimmed)
    else setTitleVal(section.title)
    setEditingTitle(false)
  }

  const isDragTarget = dragState?.sourceKind === 'day' || dragState?.sourceKind === 'general' ||
    (dragState?.sourceKind === 'section' && dragState?.sectionId !== section.id)

  return (
    <div className="sidebar-section">
      <div className="section-head">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="section-title-input"
            value={titleVal}
            maxLength={60}
            onChange={e => setTitleVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
              if (e.key === 'Escape') { setTitleVal(section.title); setEditingTitle(false) }
            }}
            onBlur={commitTitle}
          />
        ) : (
          <strong className="section-title" onDoubleClick={() => setEditingTitle(true)}>{section.title}</strong>
        )}
        <div className="section-head-actions">
          <button className="section-rename-btn" type="button" onClick={() => setEditingTitle(true)} title="Rename section">✎</button>
          <button className="section-del-btn" type="button" onClick={onDelete} title="Delete section">×</button>
        </div>
      </div>

      <ul
        className={`task-list${isDragTarget ? ' drop-target' : ''}`}
        onDragOver={e => { if (isDragTarget) e.preventDefault() }}
        onDrop={e => {
          if (!isDragTarget || !dragState) return
          e.preventDefault()
          onDropToSection(dragState.sourceKind, dragState.sourceDayKey, dragState.taskId, dragState.sectionId)
        }}
      >
        {section.tasks.length === 0 ? (
          <li className={`empty-state-sm${isDragTarget ? ' drop-target' : ''}`}>No items yet.</li>
        ) : (
          section.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isEditing={editingSectionTask?.sectionId === section.id && editingSectionTask?.taskId === task.id}
              onToggle={() => onToggleTask(task.id)}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={() => onEditTask(task.id)}
              onSave={(text) => onSaveTaskEdit(task.id, text)}
              onCancel={onCancelTaskEdit}
              onDragStart={e => {
                if (editingSectionTask?.taskId === task.id) { e.preventDefault(); return }
                setDragState({ sourceKind: 'section', sectionId: section.id, taskId: task.id })
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', task.id)
              }}
              onDragEnd={() => setDragState(null)}
            />
          ))
        )}
      </ul>

      <AddForm placeholder="Add an item" onAdd={onAddTask} textareaRef={addRef} />
    </div>
  )
}

export default function Sidebar({
  dashboard, lifetimeStats,
  editingGeneralId, editingSectionTask,
  dragState, setDragState,
  onAddGeneral, onToggleGeneral, onDeleteGeneral, onEditGeneral, onSaveGeneralEdit, onCancelGeneralEdit,
  onAddSection, onRenameSection, onDeleteSection,
  onAddSectionTask, onToggleSectionTask, onDeleteSectionTask,
  onEditSectionTask, onSaveSectionTaskEdit, onCancelSectionTaskEdit,
  onDropToGeneral, onDropToSection,
}) {
  const generalTextRef = useRef(null)

  function generalDragOver(e) {
    if (!dragState || dragState.sourceKind !== 'day') return
    e.preventDefault()
  }

  function generalDrop(e) {
    if (!dragState || dragState.sourceKind !== 'day') return
    e.preventDefault()
    onDropToGeneral(dragState.sourceKind, dragState.sourceDayKey, dragState.taskId, null)
  }

  return (
    <aside className="sidebar">
      <div className="panel-card">
        <p className="progress-summary">
          <span className="progress-line">
            <strong className="progress-label">This Week:</strong>
            {' '}{lifetimeStats.completed}/{lifetimeStats.total || 0} tasks complete
          </span>
          <span className="progress-line">
            <strong className="progress-label">Completion:</strong>
            {' '}{lifetimeStats.percent}%
          </span>
        </p>

        {/* General To Do */}
        <div className="sidebar-section">
          <div className="section-head">
            <strong className="section-title">General To Do</strong>
          </div>

          <ul
            className={`task-list${dragState?.sourceKind === 'day' ? ' drop-target' : ''}`}
            onDragOver={generalDragOver}
            onDrop={generalDrop}
          >
            {dashboard.generalTasks.length === 0 ? (
              <li className={`empty-state-sm${dragState?.sourceKind === 'day' ? ' drop-target' : ''}`}>No general items yet.</li>
            ) : (
              dashboard.generalTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isEditing={editingGeneralId === task.id}
                  onToggle={() => onToggleGeneral(task.id)}
                  onDelete={() => onDeleteGeneral(task.id)}
                  onEdit={onEditGeneral}
                  onSave={(text) => onSaveGeneralEdit(task.id, text)}
                  onCancel={onCancelGeneralEdit}
                  onDragStart={e => {
                    if (editingGeneralId === task.id) { e.preventDefault(); return }
                    setDragState({ sourceKind: 'general', taskId: task.id })
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', task.id)
                  }}
                  onDragEnd={() => setDragState(null)}
                />
              ))
            )}
          </ul>

          <AddForm placeholder="Add an anytime task" onAdd={onAddGeneral} textareaRef={generalTextRef} />
        </div>

        {/* Dynamic sections */}
        {(dashboard.sections || []).map(section => (
          <SectionBlock
            key={section.id}
            section={section}
            editingSectionTask={editingSectionTask}
            dragState={dragState}
            setDragState={setDragState}
            onRename={(title) => onRenameSection(section.id, title)}
            onDelete={() => onDeleteSection(section.id)}
            onAddTask={(text) => onAddSectionTask(section.id, text)}
            onToggleTask={(taskId) => onToggleSectionTask(section.id, taskId)}
            onDeleteTask={(taskId) => onDeleteSectionTask(section.id, taskId)}
            onEditTask={(taskId) => onEditSectionTask(section.id, taskId)}
            onSaveTaskEdit={(taskId, text) => onSaveSectionTaskEdit(section.id, taskId, text)}
            onCancelTaskEdit={onCancelSectionTaskEdit}
            onDropToSection={(sourceKind, sourceDayKey, taskId, sourceSectionId) =>
              onDropToSection(section.id, sourceKind, sourceDayKey, taskId, sourceSectionId)
            }
          />
        ))}

        <button className="add-section-btn" type="button" onClick={onAddSection}>
          + Add section
        </button>
      </div>
    </aside>
  )
}
