import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/stores/useProjectStore'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
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
                  起始
                </th>
                <th className="text-center font-medium border-r bg-muted w-12" style={{ padding: '0 1px', fontSize: '9px' }} title={t('sidebar.moveCount')}>
                  格數
                </th>
                <th className="text-center font-medium bg-muted w-12" style={{ padding: '0 1px', fontSize: '9px' }} title={t('sidebar.duration')}>
                  時長
                </th>
              </tr>
            </thead>
            <tbody>
          {groupedModules.map((group, groupIndex) => {
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
                <tr key={module.id} className="border-b hover:bg-muted/30 group [&>td]:cursor-text" style={{ height: `${grid.cellHeight}px` }}>
                  {moduleIndex === 0 && (
                    <td 
                      className="px-1 border-r align-middle bg-background"
                      rowSpan={group.modules.length}
                      style={{ height: `${grid.cellHeight}px`, padding: '0 4px' }}
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
                            className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: module.color }}
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
                      style={{ height: `${grid.cellHeight}px`, padding: '0 4px' }}
                      rowSpan={stageGroup.count}
                      onDoubleClick={() => handleCellDoubleClick(module.id, 'stage', module.stage || '')}
                    >
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
                    </td>
                  )}
                  <td 
                    className="border-r text-muted-foreground align-middle overflow-hidden"
                    style={{ height: `${grid.cellHeight}px`, padding: '0 4px', whiteSpace: 'nowrap' }}
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
                    style={{ height: `${grid.cellHeight}px`, padding: '0 4px' }}
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
                    style={{ height: `${grid.cellHeight}px`, padding: '0 4px' }}
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
                    style={{ height: `${grid.cellHeight}px`, padding: '0 4px' }}
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
        </TooltipProvider>
      </div>
    </div>
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