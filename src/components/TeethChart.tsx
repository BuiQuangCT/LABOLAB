'use client'
import { useState, useEffect } from 'react'

type TeethChartProps = {
  selectedTeeth: string[]
  onChange: (teeth: string[]) => void
}

export function TeethChart({ selectedTeeth, onChange }: TeethChartProps) {
  const toggleTooth = (tooth: string) => {
    if (selectedTeeth.includes(tooth)) {
      onChange(selectedTeeth.filter(t => t !== tooth))
    } else {
      onChange([...selectedTeeth, tooth].sort())
    }
  }

  const renderQuadrant = (teeth: string[], reverse: boolean) => (
    <div className="flex gap-0.5 sm:gap-1">
      {(reverse ? [...teeth].reverse() : teeth).map(tooth => {
        const isSelected = selectedTeeth.includes(tooth)
        return (
          <button
            key={tooth}
            type="button"
            onClick={() => toggleTooth(tooth)}
            className={`w-7 h-10 sm:w-8 sm:h-12 border-2 rounded-t-sm rounded-b-xl flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all ${
              isSelected 
                ? 'bg-primary text-primary-foreground border-primary shadow-inner scale-105' 
                : 'bg-white text-foreground hover:bg-secondary border-border hover:border-primary/50'
            }`}
          >
            {tooth}
          </button>
        )
      })}
    </div>
  )

  const q1 = ['11', '12', '13', '14', '15', '16', '17', '18']
  const q2 = ['21', '22', '23', '24', '25', '26', '27', '28']
  const q3 = ['31', '32', '33', '34', '35', '36', '37', '38']
  const q4 = ['41', '42', '43', '44', '45', '46', '47', '48']

  return (
    <div className="flex flex-col items-center gap-3 bg-secondary/10 p-4 sm:p-6 rounded-2xl border border-border overflow-x-auto w-full">
      <div className="flex items-center gap-2 sm:gap-4 justify-center w-full min-w-max">
        <div className="flex justify-end">{renderQuadrant(q1, true)}</div>
        <div className="w-px h-12 bg-border mx-1"></div>
        <div className="flex justify-start">{renderQuadrant(q2, false)}</div>
      </div>
      <div className="w-full max-w-2xl h-px bg-border my-1 min-w-max"></div>
      <div className="flex items-center gap-2 sm:gap-4 justify-center w-full min-w-max">
        <div className="flex justify-end">{renderQuadrant(q4, true)}</div>
        <div className="w-px h-12 bg-border mx-1"></div>
        <div className="flex justify-start">{renderQuadrant(q3, false)}</div>
      </div>
      <div className="text-[10px] sm:text-xs text-muted-foreground mt-2 flex justify-between w-full max-w-sm px-4">
        <span>Patient's Right</span>
        <span>Patient's Left</span>
      </div>
    </div>
  )
}
