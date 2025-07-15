import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { AnimationState } from '@/types'

interface AnimationStore extends AnimationState {
  // Actions
  play: () => void
  pause: () => void
  stop: () => void
  togglePlayPause: () => void
  setSpeed: (speed: number) => void
  setCurrentFrame: (frame: number) => void
  setTotalFrames: (frames: number) => void
  toggleLoop: () => void
  nextFrame: () => void
  previousFrame: () => void
}

export const useAnimationStore = create<AnimationStore>()(
  immer((set) => ({
    // Initial state
    isPlaying: false,
    currentFrame: 0,
    speed: 1,
    totalFrames: 0,
    loop: false,

    // Actions
    play: () => set((state) => {
      state.isPlaying = true
    }),

    pause: () => set((state) => {
      state.isPlaying = false
    }),

    stop: () => set((state) => {
      state.isPlaying = false
      state.currentFrame = 0
    }),

    togglePlayPause: () => set((state) => {
      state.isPlaying = !state.isPlaying
    }),

    setSpeed: (speed) => set((state) => {
      state.speed = Math.max(0.1, Math.min(4, speed))
    }),

    setCurrentFrame: (frame) => set((state) => {
      state.currentFrame = Math.max(0, Math.min(frame, state.totalFrames))
    }),

    setTotalFrames: (frames) => set((state) => {
      state.totalFrames = Math.max(0, frames)
      if (state.currentFrame > frames) {
        state.currentFrame = frames
      }
    }),

    toggleLoop: () => set((state) => {
      state.loop = !state.loop
    }),

    nextFrame: () => set((state) => {
      if (state.currentFrame < state.totalFrames) {
        state.currentFrame += 16.67 // Advance by ~16.67ms (60fps)
      } else if (state.loop) {
        state.currentFrame = 0
      } else {
        state.isPlaying = false // Stop when reaching the end
      }
    }),

    previousFrame: () => set((state) => {
      if (state.currentFrame > 0) {
        state.currentFrame--
      }
    })
  }))
)