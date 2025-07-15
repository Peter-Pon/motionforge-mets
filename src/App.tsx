import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from '@/components/ui/toaster'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useCSVImport } from '@/hooks/useCSVImport'
import { useProjectStore } from '@/stores/useProjectStore'
import { useAnimationStore } from '@/stores/useAnimationStore'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { GridCanvas } from '@/components/Canvas/GridCanvas'
import { ParameterTable } from '@/components/ParameterTable'
import { ModuleData } from '@/types'
import { FaPlay, FaPause, FaStop, FaRedo, FaCog, FaDownload } from 'react-icons/fa'
import { PreferencesDialog } from '@/components/PreferencesDialog'
import { ExportDialog } from '@/components/ExportDialog'
import { ShortcutsHelp } from '@/components/ShortcutsHelp'
import { TooltipButton } from '@/components/ui/tooltip-button'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'
import { AboutDialog } from '@/components/AboutDialog'
import { HelpDialog } from '@/components/HelpDialog'
import { UserGuideDialog } from '@/components/UserGuideDialog'
import { DropdownMenu } from '@/components/DropdownMenu'
import { SpeedSettingsDialog } from '@/components/SpeedSettingsDialog'

function App() {
  const { t } = useTranslation()
  const { handleImportCSV, isImporting } = useCSVImport()
  const { project, createNewProject, updateModules } = useProjectStore()
  const { 
    isPlaying, 
    currentFrame, 
    speed, 
    loop,
    play, 
    pause, 
    stop, 
    setSpeed, 
    setTotalFrames,
    setCurrentFrame,
    nextFrame,
    previousFrame,
    toggleLoop
  } = useAnimationStore()
  const { ui, updateUIPreferences } = usePreferencesStore()
  const { pushState, undo, redo, canUndo, canRedo } = useHistoryStore()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  // const animationRef = useRef<number | null>(null)
  const [calculatedTotalFrames, setCalculatedTotalFrames] = useState(0)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [userGuideOpen, setUserGuideOpen] = useState(false)
  const [speedSettingsOpen, setSpeedSettingsOpen] = useState(false)

  // Speed control functions
  const speedUp = () => {
    const currentSpeed = speed
    const speeds = [0.1, 0.25, 0.5, 1, 2, 4]
    const currentIndex = speeds.indexOf(currentSpeed)
    if (currentIndex < speeds.length - 1) {
      setSpeed(speeds[currentIndex + 1])
    }
  }

  const speedDown = () => {
    const currentSpeed = speed
    const speeds = [0.1, 0.25, 0.5, 1, 2, 4]
    const currentIndex = speeds.indexOf(currentSpeed)
    if (currentIndex > 0) {
      setSpeed(speeds[currentIndex - 1])
    }
  }

  // Toggle play/pause function
  const togglePlayPause = () => {
    if (!project || project.modules.length === 0) return
    isPlaying ? pause() : play()
  }

  // Reset animation function
  const resetAnimation = () => {
    if (!project || project.modules.length === 0) return
    setCurrentFrame(0)
    pause()
  }

  // Stop animation function
  const stopAnimation = () => {
    if (!project || project.modules.length === 0) return
    stop()
  }

  // Fullscreen toggle function
  const handleToolbarDoubleClick = () => {
    if (window.electronAPI && window.electronAPI.toggleFullscreen) {
      window.electronAPI.toggleFullscreen()
    }
  }

  // Timeline drag functions
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (calculatedTotalFrames === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newFrame = Math.max(0, Math.min(calculatedTotalFrames, percentage * calculatedTotalFrames))
    
    setCurrentFrame(newFrame)
  }

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (calculatedTotalFrames === 0) return
    
    setIsDragging(true)
    const wasPlaying = isPlaying
    if (wasPlaying) {
      pause()
    }
    
    const timelineElement = e.currentTarget
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = timelineElement.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, clickX / rect.width))
      const newFrame = percentage * calculatedTotalFrames
      
      setCurrentFrame(newFrame)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  // Toggle crosshair function
  const toggleCrosshair = () => {
    updateUIPreferences({ crosshairEnabled: !ui.crosshairEnabled })
  }

  // Undo function
  const handleUndo = () => {
    const previousState = undo()
    if (previousState && project) {
      updateModules(previousState, true) // Skip history for undo/redo
    }
  }

  // Redo function
  const handleRedo = () => {
    const nextState = redo()
    if (nextState && project) {
      updateModules(nextState, true) // Skip history for undo/redo
    }
  }

  // Load test data function
  const loadTestData = () => {
    const testModules: ModuleData[] = [
      {
        id: '1',
        moduleName: 'Feeder_1',
        actionDescription: 'material_loading',
        startX: 0,
        moveCount: 25,
        duration: 100,
        stage: 'A',
        color: '#3b82f6'
      },
      {
        id: '2',
        moduleName: 'Feeder_1',
        actionDescription: 'vibration_control',
        startX: 0, // Sequential action (startX <= 0)
        moveCount: 20,
        duration: 120,
        stage: 'A',
        color: '#3b82f6',
        isSequentialAction: true,
        calculatedStartX: 25 // Will be auto-calculated
      },
      {
        id: '3',
        moduleName: 'Feeder_1',
        actionDescription: 'flow_regulation',
        startX: -1, // Sequential action (startX <= 0)
        moveCount: 15,
        duration: 150,
        stage: 'B',
        color: '#3b82f6',
        isSequentialAction: true,
        calculatedStartX: 45 // Will be auto-calculated
      },
      {
        id: '4',
        moduleName: 'Conveyor_1',
        actionDescription: 'belt_operation',
        startX: 10,
        moveCount: 30,
        duration: 100,
        stage: 'A',
        color: '#10b981'
      },
      {
        id: '5',
        moduleName: 'Conveyor_1',
        actionDescription: 'speed_control',
        startX: 0, // Sequential action
        moveCount: 25,
        duration: 110,
        stage: 'B',
        color: '#10b981',
        isSequentialAction: true,
        calculatedStartX: 40 // Will be auto-calculated
      }
    ]
    updateModules(testModules)
    
    // Force re-render after data update
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 50)
  }

  // Keyboard shortcuts configuration
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.PLAY_PAUSE,
      action: togglePlayPause
    },
    {
      ...COMMON_SHORTCUTS.STOP,
      action: stopAnimation
    },
    {
      ...COMMON_SHORTCUTS.RESET,
      action: resetAnimation
    },
    {
      ...COMMON_SHORTCUTS.IMPORT_CSV,
      action: () => !isImporting && handleImportCSV()
    },
    {
      ...COMMON_SHORTCUTS.EXPORT,
      action: () => project && project.modules.length > 0 && setExportOpen(true)
    },
    {
      ...COMMON_SHORTCUTS.PREFERENCES,
      action: () => setPreferencesOpen(true)
    },
    {
      ...COMMON_SHORTCUTS.SPEED_UP,
      action: speedUp
    },
    {
      ...COMMON_SHORTCUTS.SPEED_DOWN,
      action: speedDown
    },
    {
      ...COMMON_SHORTCUTS.LOAD_TEST_DATA,
      action: loadTestData
    },
    {
      ...COMMON_SHORTCUTS.TOGGLE_CROSSHAIR,
      action: toggleCrosshair
    },
    {
      key: 'z',
      ctrl: true,
      action: handleUndo,
      description: 'Undo'
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: handleRedo,
      description: 'Redo'
    },
    {
      key: 'ArrowRight',
      action: nextFrame,
      description: 'Next Frame'
    },
    {
      key: 'ArrowLeft',
      action: previousFrame,
      description: 'Previous Frame'
    },
    {
      key: 'l',
      action: toggleLoop,
      description: 'Toggle Loop'
    }
  ])

  useEffect(() => {
    // Listen for menu commands
    if (window.electronAPI) {
      const handleMenuCommand = (command: string) => {
        // Handle menu commands here
        switch (command) {
          case 'import-csv':
            handleImportCSV()
            break
          case 'about':
            setAboutOpen(true)
            break
          case 'shortcuts':
            setHelpOpen(true)
            break
          case 'user-guide':
            setUserGuideOpen(true)
            break
          case 'preferences':
            setPreferencesOpen(true)
            break
          case 'export-excel':
          case 'export-pdf':
          case 'export-png':
          case 'export-mp4':
            setExportOpen(true)
            break
          case 'undo':
            handleUndo()
            break
          case 'redo':
            handleRedo()
            break
          case 'reset-animation':
            resetAnimation()
            break
          case 'play-pause':
            togglePlayPause()
            break
          case 'stop':
            stopAnimation()
            break
          case 'next-frame':
            nextFrame()
            break
          case 'prev-frame':
            previousFrame()
            break
          case 'toggle-loop':
            toggleLoop()
            break
          case 'speed-settings':
            setSpeedSettingsOpen(true)
            break
          // Add more cases as needed
        }
      }
      
      const cleanup = window.electronAPI.onMenuCommand(handleMenuCommand)
      
      // Cleanup function to remove the listener
      return cleanup
    }
  }, [handleImportCSV, handleUndo, handleRedo, resetAnimation, togglePlayPause, stopAnimation, nextFrame, previousFrame, toggleLoop])

  useEffect(() => {
    // Update document title with localized text
    document.title = t('app.title')
    
    // Initialize new project if none exists
    if (!project) {
      createNewProject()
    }
    
  }, [t, project, createNewProject])

  // Calculate total frames based on modules with sequential execution within groups
  useEffect(() => {
    if (project && project.modules.length > 0) {
      // Group modules by name
      const groups: { [key: string]: typeof project.modules } = {}
      project.modules.forEach(module => {
        if (!groups[module.moduleName]) {
          groups[module.moduleName] = []
        }
        groups[module.moduleName].push(module)
      })
      
      // Calculate max frames across all groups
      let maxFrames = 0
      Object.values(groups).forEach(groupModules => {
        const sortedModules = [...groupModules]
        const actionStartTimes: number[] = []
        
        // First pass: calculate all start times
        sortedModules.forEach((module, index) => {
          let actionStartTime = 0
          
          if (index > 0) {
            const prevModule = sortedModules[index - 1]
            const prevStartTime = actionStartTimes[index - 1]
            
            if (module.isSequentialAction) {
              // For sequential actions, start when previous action completes
              actionStartTime = prevStartTime + (prevModule.moveCount * prevModule.duration)
            } else {
              // For position-based actions, calculate based on positions
              const currentStartX = module.calculatedStartX ?? module.startX
              const prevStartX = prevModule.calculatedStartX ?? prevModule.startX
              const cellsNeeded = Math.max(0, currentStartX - prevStartX)
              actionStartTime = prevStartTime + (cellsNeeded * prevModule.duration)
            }
          }
          
          actionStartTimes.push(actionStartTime)
        })
        
        // Second pass: calculate end times
        sortedModules.forEach((module, index) => {
          const actionStartTime = actionStartTimes[index]
          const actionEndTime = actionStartTime + (module.moveCount * module.duration)
          maxFrames = Math.max(maxFrames, actionEndTime)
        })
      })
      
      setTotalFrames(maxFrames)
      setCalculatedTotalFrames(maxFrames)
    } else {
      setTotalFrames(0)
      setCalculatedTotalFrames(0)
    }
  }, [project, setTotalFrames])

  // Animation loop
  useEffect(() => {
    if (isPlaying && project && project.modules.length > 0) {
      const interval = setInterval(() => {
        nextFrame()
      }, 16.67 / speed) // Adjust interval based on speed
      
      return () => {
        clearInterval(interval)
      }
    }
  }, [isPlaying, speed, nextFrame, project, calculatedTotalFrames])

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 flex">
        {/* Sidebar - Fixed width, always visible */}
        <div className="w-80 border-r bg-muted/50 overflow-hidden flex flex-col flex-shrink-0">
          <div className="flex-1 overflow-hidden">
            <ParameterTable />
          </div>
        </div>
        
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="toolbar-area border-b px-4 py-2" onDoubleClick={handleToolbarDoubleClick}>
            <div className="flex items-center justify-between no-drag">
              <div className="flex items-center gap-4">
                <TooltipButton 
                  className="px-3 py-1 text-sm border rounded hover:bg-accent disabled:opacity-50"
                  onClick={handleImportCSV}
                  disabled={isImporting}
                  tooltip={t('shortcuts.importCSV')}
                >
                  {isImporting ? 'Importing...' : t('toolbar.importCSV')}
                </TooltipButton>
                <TooltipButton 
                  className="px-3 py-1 text-sm border rounded hover:bg-accent"
                  onClick={loadTestData}
                  tooltip={t('shortcuts.loadTestData')}
                >
                  Load Test Data
                </TooltipButton>
                
                {/* Playback Controls */}
                <div className="flex items-center gap-2 border-l pl-4">
                  <TooltipButton
                    className="p-2 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
                    onClick={togglePlayPause}
                    disabled={!project || project.modules.length === 0}
                    tooltip={t('shortcuts.playPause')}
                  >
                    {isPlaying ? <FaPause /> : <FaPlay />}
                  </TooltipButton>
                  <TooltipButton
                    className="p-2 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
                    onClick={stopAnimation}
                    disabled={!project || project.modules.length === 0}
                    tooltip={t('shortcuts.stop')}
                  >
                    <FaStop />
                  </TooltipButton>
                  <TooltipButton
                    className="p-2 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
                    onClick={resetAnimation}
                    disabled={!project || project.modules.length === 0}
                    tooltip={t('shortcuts.reset')}
                  >
                    <FaRedo />
                  </TooltipButton>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipButton
                  className="p-2 text-sm border rounded hover:bg-accent transition-colors"
                  onClick={() => setExportOpen(true)}
                  disabled={!project || project.modules.length === 0}
                  tooltip={t('shortcuts.export')}
                >
                  <FaDownload />
                </TooltipButton>
                <TooltipButton
                  className="p-2 text-sm border rounded hover:bg-accent transition-colors"
                  onClick={() => setPreferencesOpen(true)}
                  tooltip={t('shortcuts.preferences')}
                >
                  <FaCog />
                </TooltipButton>
                <DropdownMenu 
                  onAbout={() => setAboutOpen(true)}
                  onShortcuts={() => setHelpOpen(true)}
                  onUserGuide={() => setUserGuideOpen(true)}
                />
                <LanguageSelector />
              </div>
            </div>
          </div>
          
          {/* Canvas */}
          <div ref={canvasContainerRef} className="flex-1 bg-muted/20 overflow-hidden">
            <GridCanvas width={800} height={600} />
          </div>
          
          {/* Timeline Controls */}
          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {currentFrame.toFixed(0)} / {calculatedTotalFrames.toFixed(0)} ms
              </div>
              <div className="flex-1">
                <div 
                  className="relative h-2 bg-muted rounded-full overflow-hidden cursor-pointer"
                  onClick={handleTimelineClick}
                  onMouseDown={handleTimelineMouseDown}
                  title={t('timeline.scrub')}
                >
                  <div 
                    className={`absolute h-full bg-primary ${isDragging ? '' : 'transition-all'}`}
                    style={{ width: calculatedTotalFrames > 0 ? `${(currentFrame / calculatedTotalFrames) * 100}%` : '0%' }}
                  />
                  {/* Timeline thumb */}
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing"
                    style={{ 
                      left: calculatedTotalFrames > 0 ? `calc(${(currentFrame / calculatedTotalFrames) * 100}% - 8px)` : '-8px',
                      opacity: calculatedTotalFrames > 0 ? 1 : 0
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">{t('timeline.speed')}:</label>
                  <select 
                    className="text-sm border rounded px-2 py-0.5"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    title={`${t('shortcuts.speedUp')} / ${t('shortcuts.speedDown')}`}
                  >
                    <option value="0.1">0.1x</option>
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="4">4x</option>
                  </select>
                </div>
                <TooltipButton
                  className={`px-2 py-0.5 text-sm border rounded transition-colors ${loop ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  onClick={toggleLoop}
                  tooltip={t('shortcuts.toggleLoop', 'Toggle Loop (Cmd/Ctrl+L)')}
                >
                  {t('timeline.loop')}
                </TooltipButton>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
      <PreferencesDialog 
        isOpen={preferencesOpen} 
        onClose={() => setPreferencesOpen(false)} 
      />
      <ExportDialog 
        isOpen={exportOpen} 
        onClose={() => setExportOpen(false)} 
      />
      <AboutDialog 
        isOpen={aboutOpen} 
        onClose={() => setAboutOpen(false)} 
      />
      <HelpDialog 
        isOpen={helpOpen} 
        onClose={() => setHelpOpen(false)} 
      />
      <UserGuideDialog 
        isOpen={userGuideOpen} 
        onClose={() => setUserGuideOpen(false)} 
      />
      <SpeedSettingsDialog 
        isOpen={speedSettingsOpen} 
        onClose={() => setSpeedSettingsOpen(false)} 
      />
      <ShortcutsHelp />
    </div>
  )
}

export default App