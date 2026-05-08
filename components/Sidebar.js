'use client'

import { useRef, useEffect } from 'react'

function TaskItem({ task, isEditing, onToggle, onDelete, onEdit, onSave, onCancel, onDragStart, onDragEnd, listType }) {
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

export default function Sidebar({
  dashboard, activeDashboard, lifetimeStats,
  editingGeneralId, editingBuyId,
  dragState, setDragState,
  onAddGeneral, onToggleGeneral, onDeleteGeneral, onEditGeneral, onSaveGeneralEdit, onCancelGeneralEdit,
  onAddBuy, onToggleBuy, onDeleteBuy, onEditBuy, onSaveBuyEdit, onCancelBuyEdit,
  onDropToGeneral, onDropToBuy,
}) {
  const generalTextRef = useRef(null)
  const buyTextRef = useRef(null)

  const buyLabel = activeDashboard === 'SWAY' ? 'Leads & New Business' : 'Things To Buy'

  function generalDragOver(e) {
    if (!dragState || dragState.sourceKind !== 'day') return
    e.preventDefault()
  }

  function generalDrop(e) {
    if (!dragState || dragState.sourceKind !== 'day') return
    e.preventDefault()
    onDropToGeneral(dragState.sourceDayKey, dragState.taskId)
  }

  function buyDragOver(e) {
    const ok = dragState?.sourceKind === 'day' || dragState?.sourceKind === 'general'
    if (!ok) return
    e.preventDefault()
  }

  function buyDrop(e) {
    const ok = dragState?.sourceKind === 'day' || dragState?.sourceKind === 'general'
    if (!ok) return
    e.preventDefault()
    onDropToBuy(dragState.sourceKind, dragState.sourceDayKey, dragState.taskId)
  }

  return (
    <aside className="sidebar">
      <div className="panel-card">
        <p className="progress-summary">
          <strong>{lifetimeStats.completed}/{lifetimeStats.total || 0}</strong> tasks complete &nbsp;·&nbsp; <strong>{lifetimeStats.percent}%</strong> completion
        </p>

        {/* General To Do */}
        <div className="sidebar-section">
          <div className="section-head">
            <strong className="section-title">General To Do</strong>
            <span className="section-hint">Drag tasks to a day, or add below</span>
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

        {/* Buy / Leads */}
        <div className="sidebar-section">
          <div className="section-head">
            <strong className="section-title">{buyLabel}</strong>
          </div>

          <ul
            className={`task-list${(dragState?.sourceKind === 'day' || dragState?.sourceKind === 'general') ? ' drop-target' : ''}`}
            onDragOver={buyDragOver}
            onDrop={buyDrop}
          >
            {dashboard.buyTasks.length === 0 ? (
              <li className={`empty-state-sm${(dragState?.sourceKind === 'day' || dragState?.sourceKind === 'general') ? ' drop-target' : ''}`}>
                {activeDashboard === 'SWAY' ? 'No leads yet.' : 'No items to buy yet.'}
              </li>
            ) : (
              dashboard.buyTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isEditing={editingBuyId === task.id}
                  onToggle={() => onToggleBuy(task.id)}
                  onDelete={() => onDeleteBuy(task.id)}
                  onEdit={onEditBuy}
                  onSave={(text) => onSaveBuyEdit(task.id, text)}
                  onCancel={onCancelBuyEdit}
                  onDragStart={e => {
                    if (editingBuyId === task.id) { e.preventDefault(); return }
                    setDragState({ sourceKind: 'buy', taskId: task.id })
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', task.id)
                  }}
                  onDragEnd={() => setDragState(null)}
                />
              ))
            )}
          </ul>

          <AddForm
            placeholder={activeDashboard === 'SWAY' ? 'Add a lead or prospect' : 'Add something to buy'}
            onAdd={onAddBuy}
            textareaRef={buyTextRef}
          />
        </div>
      </div>
    </aside>
  )
}
