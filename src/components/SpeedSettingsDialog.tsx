import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { useAnimationStore } from '@/stores/useAnimationStore'

interface SpeedSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SpeedSettingsDialog({ isOpen, onClose }: SpeedSettingsDialogProps) {
  const { t } = useTranslation()
  const { speed, setSpeed } = useAnimationStore()
  const [tempSpeed, setTempSpeed] = useState(speed)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const handleApply = () => {
    setSpeed(tempSpeed)
    onClose()
  }

  const handleCancel = () => {
    setTempSpeed(speed)
    onClose()
  }

  const speedPresets = [
    { label: '0.1x', value: 0.1 },
    { label: '0.25x', value: 0.25 },
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1 },
    { label: '2x', value: 2 },
    { label: '4x', value: 4 },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('menu.animation.speedSettings')}</DialogTitle>
          <DialogDescription>
            {t('menu.animation.speedSettingsDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <div>
              <Label>{t('menu.animation.currentSpeed')}: {tempSpeed}x</Label>
              <Slider
                value={[tempSpeed]}
                onValueChange={(value) => setTempSpeed(value[0])}
                min={0.1}
                max={4}
                step={0.1}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {speedPresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={tempSpeed === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTempSpeed(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleApply}>
            {t('common.apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}