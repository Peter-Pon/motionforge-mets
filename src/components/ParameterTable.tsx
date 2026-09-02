import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/stores/useProjectStore'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import { useUIStore } from '@/stores/useUIStore'
import { useAnimationStore } from '@/stores/useAnimationStore'
import { computeActionStartTimes } from '@/lib/timingModel'
import { hexToRgba } from '@/lib/canvasRenderer'
import { ModuleData } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Helper function to truncate text
function truncateText(text: string, maxLength: number = 16): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

interface EditingCell {
  moduleId: string
  field: keyof ModuleData
  value: string
}

export function ParameterTable() {
  const { t } = useTranslation()
  const { project, updateModule } = useProjectStore()
  const { grid } = usePreferencesStore()
  const { zoom } = useUIStore()
  // Rows follow the canvas zoom so the table stays aligned with the chart;
  // the cell text scales with them (see .parameter-scroll tbody in index.css).
  const rowHeight = grid.cellHeight * zoom
  const rowFontSize = Math.min(18, 12 * zoom)
  const dotSize = Math.min(12, Math.max(2, rowHeight * 0.5))
  // Bottom spacer so the table can scroll exactly as far as the canvas. The
  // canvas pads its bottom and sits above the timeline, so without this the
  // table runs out of travel first and the two drift apart on the last rows.
  const [bottomSpacer, setBottomSpacer] = useState(0)
  useEffect(() => {
    const measure = () => {
      const canvasBox = document.querySelector('[data-timing-canvas]')?.parentElement?.parentElement
      const tableBox = document.querySelector('.parameter-scroll')
      if (!canvasBox || !tableBox) return
      const canvasTravel = canvasBox.scrollHeight - canvasBox.clientHeight
      const tableTravel = tableBox.scrollHeight - tableBox.clientHeight
      setBottomSpacer(prev => Math.max(0, Math.round(prev + canvasTravel - tableTravel)))
    }
    // After the canvas has re-laid out for the same change.
    const timer = setTimeout(measure, 0)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [project, zoom, grid.cellHeight])
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [titleHeight, setTitleHeight] = useState(52) // Default height

  // Dynamic height calculation to match canvas alignment
  useEffect(() => {
    const calculateTitleHeight = () => {
      const toolbar = document.querySelector('.toolbar-area')
      const canvasRulerHeight = 40 // Canvas HEADER_HEIGHT
      const tableHeaderHeight = 28 // Our table header height
      
      if (toolbar) {
        const toolbarHeight = toolbar.getBoundingClientRect().height
        // Precise calculation: toolbar + canvas ruler - table header
        const calculatedHeight = toolbarHeight + canvasRulerHeight - tableHeaderHeight
        setTitleHeight(calculatedHeight)
      } else {
        // Fallback: use default toolbar height (49) + canvas ruler (40) - table header (28) = 61
        setTitleHeight(61)
      }
    }

    // Calculate multiple times to handle dynamic content
    calculateTitleHeight()
    const timer1 = setTimeout(calculateTitleHeight, 100)
    const timer2 = setTimeout(calculateTitleHeight, 500)
    const timer3 = setTimeout(calculateTitleHeight, 1000)
    
    window.addEventListener('resize', calculateTitleHeight)
    
    return () => {
      window.removeEventListener('resize', calculateTitleHeight)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [project, grid.cellHeight, grid.cellWidth]) // Re-calculate when grid dimensions change

  if (!project || project.modules.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 py-2 border-b bg-muted">
          <h2 className="text-sm font-semibold">{t('sidebar.parameters')}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('sidebar.noData')}</p>
        </div>
      </div>
    )
  }

  // Group modules by name for row merging
  const groupedModules = groupModulesByName(project.modules)

  // Handle cell double click to start editing
  const handleCellDoubleClick = (moduleId: string, field: keyof ModuleData, value: any) => {
    // Only allow editing certain fields
    if (['moduleName', 'actionDescription', 'startX', 'moveCount', 'duration', 'stage'].includes(field)) {
      setEditingCell({
        moduleId,
        field,
        value: String(value)
      })
    }
  }

  // Handle editing complete
  const handleEditComplete = () => {
    if (editingCell) {
      const { moduleId, field, value } = editingCell
      
      // Validate numeric fields
      if (['startX', 'moveCount', 'duration'].includes(field)) {
        const numValue = parseFloat(value)
        if (!isNaN(numValue) && numValue >= 0) {
          const finalValue = field === 'duration' ? numValue : Math.floor(numValue)
          updateModule(moduleId, { [field]: finalValue })
        }
      } else {
        // Text fields
        if (value.trim()) {
          updateModule(moduleId, { [field]: value.trim() })
        }
      }
      
      setEditingCell(null)
    }
  }

  // Handle key press in edit input
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditComplete()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 參數標題區域：動態計算高度以與畫布對齊 */}
      <div 
        className="px-4 border-b bg-muted flex items-center justify-between"
        style={{ height: `${titleHeight}px` }}
      >
        <h2 className="text-sm font-semibold">{t('sidebar.parameters')}</h2>
        {project.modules.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {project.modules.length} {t('sidebar.items', { count: project.modules.length })}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto parameter-scroll">
        <TooltipProvider delayDuration={300}>
          <table className="w-full border-collapse text-xs table-fixed">
            <thead className="sticky top-0 bg-muted z-10 shadow-sm">
              <tr className="border-b" style={{ height: '28px' }}>
                <th className="text-left font-medium border-r bg-muted w-16" style={{ padding: '0 2px', fontSize: '10px' }} title={t('sidebar.module')}>
                  {t('sidebar.module').length > 4 ? t('sidebar.module').substring(0, 4) + '...' : t('sidebar.module')}
                </th>
                <th className="text-center font-medium border-r bg-muted w-12" style={{ padding: '0 1px', fontSize: '9px' }} title={t('sidebar.stage')}>
                  {t('sidebar.stage')}
                </th>
                <th className="text-left font-medium border-r bg-muted" style={{ padding: '0 2px', fontSize: '10px' }} title={t('sidebar.action')}>
                  {t('sidebar.action').length > 6 ? t('sidebar.action').substring(0, 6) + '...' : t('sidebar.action')}
                </th>
                <th className="text-center font-medium border-r bg-muted w-12" style={{ padding: '0 1px', fontSize: '9px' }} title={t('sidebar.startPosition')}>
                  {t('sidebar.startPosition')}
                </th>
                <th className="text-center font-medium border-r bg-muted w-12" style={{ padding: '0 1px', fontSize: '9px' }} title={t('sidebar.moveCount')}>
                  {t('sidebar.moveCount')}
                </th>
                <th className="text-center font-medium bg-muted w-12" style={{ padding: '0 1px', fontSize: '9px' }} title={t('sidebar.duration')}>
                  {t('sidebar.duration')}
                </th>
              </tr>
            </thead>
            <tbody style={{ ['--row-font-size' as string]: `${rowFontSize}px` } as React.CSSProperties}>
          {groupedModules.map((group, groupIndex) => {
            // When each action in this module starts, for the stage progress bars.
            const startTimes = computeActionStartTimes(group.modules)
            // Create stage groups within each module group
            const stageGroups: { stage: string | undefined; startIndex: number; count: number }[] = []
            let currentStage = group.modules[0]?.stage
            let startIndex = 0
            let count = 1
            
            for (let i = 1; i < group.modules.length; i++) {
              if (group.modules[i].stage === currentStage) {
                count++
              } else {
                stageGroups.push({ stage: currentStage, startIndex, count })
                currentStage = group.modules[i].stage
                startIndex = i
                count = 1
              }
            }
            stageGroups.push({ stage: currentStage, startIndex, count })
            
            return (
            <React.Fragment key={groupIndex}>
              {group.modules.map((module, moduleIndex) => {
                // Find if this is the first row of a stage group
                const stageGroup = stageGroups.find(sg => sg.startIndex === moduleIndex)
                const shouldRenderStage = stageGroup !== undefined
                
                return (
                <tr key={module.id} className="border-b hover:bg-muted/30 group [&>td]:cursor-text" style={{ height: `${rowHeight}px` }}>
                  {moduleIndex === 0 && (
                    <td 
                      className="px-1 border-r align-middle bg-background"
                      rowSpan={group.modules.length}
                      style={{ height: `${rowHeight}px`, padding: '0 4px' }}
                      onDoubleClick={() => handleCellDoubleClick(module.id, 'moduleName', module.moduleName)}
                    >
                      {editingCell?.moduleId === module.id && editingCell.field === 'moduleName' ? (
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={handleEditComplete}
                          onKeyDown={handleEditKeyDown}
                          className="w-full px-1 py-0 text-xs border rounded"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-start gap-1.5">
                          <div 
                            className="rounded-sm mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: module.color, width: dotSize, height: dotSize }}
                          />
                          {group.name.length > 6 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium text-xs leading-tight truncate block cursor-default select-text">
                                  {truncateText(group.name, 6)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{group.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="font-medium text-xs leading-tight block select-text">
                              {group.name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                  {shouldRenderStage && (
                    <td
                      className="border-r text-center align-middle"
                      style={{ height: `${rowHeight}px`, padding: '0 4px', position: 'relative', overflow: 'hidden' }}
                      rowSpan={stageGroup.count}
                      onDoubleClick={() => handleCellDoubleClick(module.id, 'stage', module.stage || '')}
                    >
                      <StageProgress
                        actions={group.modules.slice(stageGroup.startIndex, stageGroup.startIndex + stageGroup.count)}
                        startTimes={startTimes.slice(stageGroup.startIndex, stageGroup.startIndex + stageGroup.count)}
                        rowHeight={rowHeight}
                        color={module.color || '#3b82f6'}
                      />
                      <div className="relative z-10" style={{ textShadow: '0 0 2px #fff, 0 0 2px #fff' }}>
                      {editingCell?.moduleId === module.id && editingCell.field === 'stage' ? (
                        <input
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                          onBlur={handleEditComplete}
                          onKeyDown={handleEditKeyDown}
                          className="w-full px-1 py-0 text-xs border rounded text-center"
                          autoFocus
                        />
                      ) : (
                        (module.stage && module.stage.length > 3) ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground block truncate cursor-default select-text">
                                {truncateText(module.stage, 3)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{module.stage}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground select-text">
                            {module.stage || '-'}
                          </span>
                        )
                      )}
                      </div>
                    </td>
                  )}
                  <td 
                    className="border-r text-muted-foreground align-middle overflow-hidden"
                    style={{ height: `${rowHeight}px`, padding: '0 4px', whiteSpace: 'nowrap' }}
                    onDoubleClick={() => handleCellDoubleClick(module.id, 'actionDescription', module.actionDescription)}
                  >
                    {editingCell?.moduleId === module.id && editingCell.field === 'actionDescription' ? (
                      <input
                        type="text"
                        value={editingCell.value}
                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                        onBlur={handleEditComplete}
                        onKeyDown={handleEditKeyDown}
                        className="w-full px-1 py-0 text-xs border rounded"
                        autoFocus
                      />
                    ) : (
                      module.actionDescription.length > 6 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs block truncate cursor-default select-text">
                              {truncateText(module.actionDescription, 6)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{module.actionDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs block select-text">
                          {module.actionDescription}
                        </span>
                      )
                    )}
                  </td>
                  <td 
                    className="border-r text-center tabular-nums font-mono align-middle"
                    style={{ height: `${rowHeight}px`, padding: '0 4px' }}
                    onDoubleClick={() => handleCellDoubleClick(module.id, 'startX', module.startX)}
                  >
                    {editingCell?.moduleId === module.id && editingCell.field === 'startX' ? (
                      <input
                        type="number"
                        value={editingCell.value}
                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                        onBlur={handleEditComplete}
                        onKeyDown={handleEditKeyDown}
                        className="w-full px-1 py-0 text-xs border rounded text-center"
                        min="0"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="select-text">{module.startX}</span>
                        {module.isSequentialAction && (
                          <span className="text-xs text-blue-500" title={`Auto-calculated: ${module.calculatedStartX}`}>
                            *
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td 
                    className="border-r text-center tabular-nums font-mono align-middle"
                    style={{ height: `${rowHeight}px`, padding: '0 4px' }}
                    onDoubleClick={() => handleCellDoubleClick(module.id, 'moveCount', module.moveCount)}
                  >
                    {editingCell?.moduleId === module.id && editingCell.field === 'moveCount' ? (
                      <input
                        type="number"
                        value={editingCell.value}
                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                        onBlur={handleEditComplete}
                        onKeyDown={handleEditKeyDown}
                        className="w-full px-1 py-0 text-xs border rounded text-center"
                        min="0"
                        autoFocus
                      />
                    ) : (
                      <span className="select-text">{module.moveCount}</span>
                    )}
                  </td>
                  <td 
                    className="text-center tabular-nums font-mono align-middle"
                    style={{ height: `${rowHeight}px`, padding: '0 4px' }}
                    onDoubleClick={() => handleCellDoubleClick(module.id, 'duration', module.duration)}
                  >
                    {editingCell?.moduleId === module.id && editingCell.field === 'duration' ? (
                      <input
                        type="number"
                        value={editingCell.value}
                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                        onBlur={handleEditComplete}
                        onKeyDown={handleEditKeyDown}
                        className="w-full px-1 py-0 text-xs border rounded text-center"
                        min="0"
                        step="0.1"
                        autoFocus
                      />
                    ) : (
                      <span className="select-text">{module.duration}</span>
                    )}
                  </td>
                </tr>
                )
              })}
            </React.Fragment>
            )
          })}
            </tbody>
          </table>
          <div style={{ height: `${bottomSpacer}px` }} aria-hidden="true" />
        </TooltipProvider>
      </div>
    </div>
  )
}

interface StageProgressProps {
  /** The consecutive actions that share this stage cell, in row order. */
  actions: ModuleData[]
  /** Start time (ms) of each of those actions, from the timing model. */
  startTimes: number[]
  rowHeight: number
  color: string
}

/**
 * Live progress inside a stage cell: one bar per row the cell spans, filling
 * left to right as that row's action advances and complete once it ends, so
 * the stage column reads as a compact mirror of the chart. Subscribes to the
 * playhead itself, so the rest of the table does not re-render every frame.
 */
function StageProgress({ actions, startTimes, rowHeight, color }: StageProgressProps) {
  const currentFrame = useAnimationStore(state => state.currentFrame)
  const coloringMode = usePreferencesStore(state => state.animation.coloringMode)
  const fill = hexToRgba(color, 0.8)

  return (
    <>
      {actions.map((action, index) => {
        const total = action.moveCount * action.duration
        if (total <= 0) return null
        const elapsed = currentFrame - startTimes[index]
        let progress = 0
        if (elapsed >= total) {
          progress = 1
        } else if (elapsed > 0) {
          // Same rule as the canvas overlay: 'instant' snaps a whole cell as
          // soon as it starts, 'gradual' fills the current cell proportionally.
          progress = coloringMode === 'instant'
            ? Math.min(action.moveCount, Math.floor(elapsed / action.duration) + 1) / action.moveCount
            : elapsed / total
        }
        if (progress <= 0) return null
        return (
          <div
            key={action.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: index * rowHeight,
              height: rowHeight,
              width: `${progress * 100}%`,
              backgroundColor: fill,
              pointerEvents: 'none'
            }}
          />
        )
      })}
    </>
  )
}

// Helper function to group modules by name
function groupModulesByName(modules: ModuleData[]): { name: string; modules: ModuleData[] }[] {
  const groups: { [key: string]: ModuleData[] } = {}
  
  modules.forEach(module => {
    if (!groups[module.moduleName]) {
      groups[module.moduleName] = []
    }
    groups[module.moduleName].push(module)
  })
  
  return Object.entries(groups).map(([name, modules]) => ({
    name,
    modules
  }))
}