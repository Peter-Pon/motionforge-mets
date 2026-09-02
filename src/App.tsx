import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from '@/components/ui/toaster'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useCSVImport } from '@/hooks/useCSVImport'
import { useProjectStore } from '@/stores/useProjectStore'
import { FRAME_STEP_MS, useAnimationStore } from '@/stores/useAnimationStore'
import { useHistoryStore } from '@/stores/useHistoryStore'
import { GridCanvas } from '@/components/Canvas/GridCanvas'
import { ParameterTable } from '@/components/ParameterTable'
import { ModuleData } from '@/types'
import { FaPlay, FaPause, FaStop, FaRedo, FaCog, FaDownload } from 'react-icons/fa'
import { ZoomIn, ZoomOut, Maximize, LocateFixed, FileUp, Loader2 } from 'lucide-react'
import { useUIStore, MAX_ZOOM, MIN_ZOOM } from '@/stores/useUIStore'
import { computeContentSize } from '@/lib/canvasRenderer'
import { PreferencesDialog } from '@/components/PreferencesDialog'
import { ExportDialog } from '@/components/ExportDialog'
import { computeTotalDurationMs } from '@/lib/timingModel'
import { ShortcutsHelp } from '@/components/ShortcutsHelp'
import { TooltipButton } from '@/components/ui/tooltip-button'
import { usePreferencesStore } from '@/stores/usePreferencesStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { SHORTCUTS } from '@/lib/shortcuts'
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
  const { ui, grid, updateUIPreferences } = usePreferencesStore()
  const { zoom, zoomIn, zoomOut, setZoom, resetZoom, followPlayback, toggleFollowPlayback } = useUIStore()
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

  // Fullscreen toggle: the native window in Electron, the document elsewhere.
  const toggleFullscreen = () => {
    if (window.electronAPI?.toggleFullscreen) {
      window.electronAPI.toggleFullscreen()
    } else if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen?.()
    }
  }

  const handleToolbarDoubleClick = toggleFullscreen

  // View: zoom so the whole chart is visible. The content size is measured
  // at zoom 1 and compared with the canvas viewport; small projects are
  // allowed to grow but not past 2x, where the cells stop looking like a chart.
  const fitToWindow = () => {
    const container = canvasContainerRef.current
    if (!container) return
    const content = computeContentSize(project?.modules ?? [], grid.cellWidth, grid.cellHeight)
    const margin = 16
    const fit = Math.min(
      (container.clientWidth - margin) / content.width,
      (container.clientHeight - margin) / content.height
    )
    setZoom(Math.min(2, fit))
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

  // Every shortcut comes from the registry (lib/shortcuts.ts); this one command
  // table serves both the native menu (over IPC) and the key handler, so the
  // menu, the keys and the help dialog cannot disagree.
  const commands: Record<string, () => void> = {
    'import-csv': () => { if (!isImporting) handleImportCSV() },
    export: () => { if (project && project.modules.length > 0) setExportOpen(true) },
    undo: handleUndo,
    redo: handleRedo,
    preferences: () => setPreferencesOpen(true),
    'zoom-in': zoomIn,
    'zoom-out': zoomOut,
    'fit-window': fitToWindow,
    'actual-size': resetZoom,
    'toggle-crosshair': toggleCrosshair,
    'toggle-fullscreen': toggleFullscreen,
    'play-pause': togglePlayPause,
    stop: stopAnimation,
    'reset-animation': resetAnimation,
    'next-frame': nextFrame,
    'prev-frame': previousFrame,
    'speed-up': speedUp,
    'speed-down': speedDown,
    'speed-settings': () => setSpeedSettingsOpen(true),
    'toggle-loop': toggleLoop,
    'toggle-follow': toggleFollowPlayback,
    shortcuts: () => setHelpOpen(true),
    'user-guide': () => setUserGuideOpen(true),
    about: () => setAboutOpen(true)
  }

  useKeyboardShortcuts(
    SHORTCUTS.flatMap(shortcut =>
      (shortcut.bindings ?? []).map(binding => ({
        ...binding,
        action: commands[shortcut.command],
        description: shortcut.command
      }))
    )
  )

  // Keep the native menu's checkboxes in step with the renderer.
  useEffect(() => {
    window.electronAPI?.setMenuState?.({ loop, follow: followPlayback, crosshair: ui.crosshairEnabled })
  }, [loop, followPlayback, ui.crosshairEnabled])

  // Menu commands arrive over IPC and go through the same table. The table is
  // rebuilt every render, so the listener is re-attached every render too;
  // that is cheap and keeps the closures fresh.
  useEffect(() => {
    if (!window.electronAPI?.onMenuCommand) return
    return window.electronAPI.onMenuCommand((command: string) => {
      commands[command]?.()
    })
  }, [commands])

  useEffect(() => {
    // Update document title with localized text
    document.title = t('app.title')
    
    // Initialize new project if none exists
    if (!project) {
      createNewProject()
    }
    
  }, [t, project, createNewProject])

  // Calculate total frames from the shared timing model, so the timeline, the
  // canvas overlay and the MP4 exporter all agree on how long a cycle runs.
  useEffect(() => {
    const totalMs = project ? computeTotalDurationMs(project.modules) : 0
    setTotalFrames(totalMs)
    setCalculatedTotalFrames(totalMs)
  }, [project, setTotalFrames])

  // Animation loop
  useEffect(() => {
    if (isPlaying && project && project.modules.length > 0) {
      const interval = setInterval(() => {
        nextFrame()
      }, FRAME_STEP_MS / speed) // Adjust interval based on speed
      
      return () => {
        clearInterval(interval)
      }
    }
  }, [isPlaying, speed, nextFrame, project, calculatedTotalFrames])

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Fixed width, always visible */}
        <div className="w-80 border-r bg-muted/50 overflow-hidden flex flex-col flex-shrink-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ParameterTable />
          </div>
        </div>
        
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Toolbar */}
          <div className="toolbar-area border-b px-4 py-2" onDoubleClick={handleToolbarDoubleClick}>
            <div className="flex items-center justify-between no-drag">
              <div className="flex items-center gap-4">
                <TooltipButton
                  className="p-2 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
                  onClick={handleImportCSV}
                  disabled={isImporting}
                  tooltip={t('shortcuts.importCSV')}
                  aria-label={t('toolbar.importCSV')}
                >
                  {isImporting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <FileUp className="h-3.5 w-3.5" />}
                </TooltipButton>
                <TooltipButton
                  className="p-2 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
                  onClick={() => setExportOpen(true)}
                  disabled={!project || project.modules.length === 0}
                  tooltip={t('shortcuts.export')}
                  aria-label={t('menu.file.export.title')}
                >
                  <FaDownload />
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
                  <TooltipButton
                    className={`p-2 text-sm border rounded transition-colors ${followPlayback ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent'}`}
                    onClick={toggleFollowPlayback}
                    tooltip={t('shortcuts.followPlayback')}
                    aria-pressed={followPlayback}
                  >
                    <LocateFixed className="h-3.5 w-3.5" />
                  </TooltipButton>
                  <select
                    className="h-8 text-sm border rounded px-1.5 bg-background hover:bg-accent transition-colors"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    title={`${t('timeline.speed')}: ${t('shortcuts.speedUp')} / ${t('shortcuts.speedDown')}`}
                    aria-label={t('timeline.speed')}
                  >
                    <option value="0.1">0.1x</option>
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="4">4x</option>
                  </select>
                </div>

                {/* View Controls */}
                <div className="flex items-center gap-2 border-l pl-4">
                  <TooltipButton
                    className="p-2 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
                    onClick={zoomOut}
                    disabled={zoom <= MIN_ZOOM}
                    tooltip={t('shortcuts.zoomOut')}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </TooltipButton>
                  <span className="w-11 text-center text-xs tabular-nums text-muted-foreground select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <TooltipButton
                    className="p-2 text-sm border rounded hover:bg-accent disabled:opacity-50 transition-colors"
                    onClick={zoomIn}
                    disabled={zoom >= MAX_ZOOM}
                    tooltip={t('shortcuts.zoomIn')}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </TooltipButton>
                  <TooltipButton
                    className="p-2 text-sm border rounded hover:bg-accent transition-colors"
                    onClick={fitToWindow}
                    tooltip={t('shortcuts.fitWindow')}
                  >
                    <Maximize className="h-3.5 w-3.5" />
                  </TooltipButton>
                  <TooltipButton
                    className="px-2 py-1.5 text-xs font-medium border rounded hover:bg-accent disabled:opacity-50 transition-colors tabular-nums"
                    onClick={resetZoom}
                    disabled={zoom === 1}
                    tooltip={t('shortcuts.actualSize')}
                  >
                    1:1
                  </TooltipButton>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
          <div ref={canvasContainerRef} className="flex-1 min-h-0 bg-muted/20 overflow-hidden">
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