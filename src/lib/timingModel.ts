import { ModuleData } from '@/types'

/**
 * Timing model — the single source of truth for *when* each action runs.
 *
 * This logic used to be duplicated in App.tsx (to size the timeline) and in
 * GridCanvas.tsx (to paint the animation overlay). The video exporter needs the
 * same answer as both, so it lives here now and all three import it. Changing
 * the rules in one place changes the timeline, the canvas and the MP4 together.
 */

export interface ModuleGroup {
  name: string
  modules: ModuleData[]
}

/** Group modules by name, preserving first-seen order. */
export function groupModulesByName(modules: ModuleData[]): ModuleGroup[] {
  const groups: Record<string, ModuleData[]> = {}

  modules.forEach(module => {
    if (!groups[module.moduleName]) {
      groups[module.moduleName] = []
    }
    groups[module.moduleName].push(module)
  })

  return Object.entries(groups).map(([name, groupModules]) => ({
    name,
    modules: groupModules
  }))
}

/**
 * Start time (ms) of every action within one module group.
 *
 * The first action starts at 0. After that an action either waits for the
 * previous one to finish (`isSequentialAction`), or starts once the previous
 * action has advanced far enough to reach this action's start column.
 */
export function computeActionStartTimes(groupModules: ModuleData[]): number[] {
  const startTimes: number[] = []

  groupModules.forEach((module, index) => {
    if (index === 0) {
      startTimes.push(0)
      return
    }

    const prevModule = groupModules[index - 1]
    const prevStartTime = startTimes[index - 1]

    if (module.isSequentialAction) {
      startTimes.push(prevStartTime + prevModule.moveCount * prevModule.duration)
    } else {
      const currentStartX = module.calculatedStartX ?? module.startX
      const prevStartX = prevModule.calculatedStartX ?? prevModule.startX
      const cellsNeeded = Math.max(0, currentStartX - prevStartX)
      startTimes.push(prevStartTime + cellsNeeded * prevModule.duration)
    }
  })

  return startTimes
}

/** Wall-clock length of the whole animation, in milliseconds. */
export function computeTotalDurationMs(modules: ModuleData[]): number {
  let total = 0

  groupModulesByName(modules).forEach(group => {
    const startTimes = computeActionStartTimes(group.modules)
    group.modules.forEach((module, index) => {
      total = Math.max(total, startTimes[index] + module.moveCount * module.duration)
    })
  })

  return total
}
