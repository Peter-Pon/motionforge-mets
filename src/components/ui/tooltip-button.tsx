import React, { useState, useRef } from 'react'

interface TooltipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip: string
  children: React.ReactNode
}

export const TooltipButton: React.FC<TooltipButtonProps> = ({ 
  tooltip, 
  children, 
  className = '',
  disabled,
  ...props 
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (disabled) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 300) // 300ms delay before showing tooltip
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowTooltip(false)
  }

  return (
    <div className="relative inline-block">
      <button
        {...props}
        disabled={disabled}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </button>
      
      {showTooltip && tooltip && !disabled && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[9999] pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-md py-2 px-3 whitespace-nowrap shadow-lg">
            {tooltip}
            {/* Tooltip arrow */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}