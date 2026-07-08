'use client'
import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'

type TeethChartProps = {
  selectedTeeth: string[]
  onChange: (teeth: string[]) => void
}

export function TeethChart({ selectedTeeth, onChange }: TeethChartProps) {
  const [inputText, setInputText] = useState('')

  const toggleTooth = (tooth: string) => {
    if (selectedTeeth.includes(tooth)) {
      onChange(selectedTeeth.filter(t => t !== tooth))
    } else {
      onChange([...selectedTeeth, tooth].sort())
    }
  }

  // Handle manual input like "11 12 21 22"
  const handleInput = (val: string) => {
    setInputText(val)
    const matches = val.match(/\b[1-4][1-8]\b/g)
    if (matches) {
      const unique = Array.from(new Set(matches)).sort()
      onChange(unique)
    } else if (val.trim() === '') {
      onChange([])
    }
  }

  useEffect(() => {
    if (selectedTeeth.length === 0 && inputText) {
      setInputText('')
    }
  }, [selectedTeeth])

  const renderQuadrant = (teeth: string[], reverse: boolean) => (
    <div className="flex gap-1 sm:gap-2 justify-center sm:justify-start">
      {(reverse ? [...teeth].reverse() : teeth).map(tooth => {
        const isSelected = selectedTeeth.includes(tooth)
        return (
          <button
            key={tooth}
            type="button"
            onClick={() => toggleTooth(tooth)}
            className={`w-8 h-9 sm:w-9 sm:h-10 border rounded-md flex items-center justify-center text-xs sm:text-sm transition-all ${
              isSelected 
                ? 'bg-[#1a3324] text-white border-[#1a3324] shadow-sm font-bold scale-105' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'
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
    <div className="flex flex-col gap-4 bg-[#f8fafc] p-4 rounded-xl border border-border w-full overflow-x-auto">
      {/* Header Info */}
      <div className="bg-[#f1f5f9] px-4 py-3 rounded-lg border border-slate-200 text-sm font-mono text-slate-600">
        {selectedTeeth.length === 0 ? (
          <span className="italic">No teeth selected</span>
        ) : (
          <span className="font-bold text-[#1a3324]">Selected: {selectedTeeth.join(', ')}</span>
        )}
      </div>

      {/* Chart Layout */}
      <div className="flex flex-col gap-4 py-2 relative w-full items-center">
        
        {/* UPPER */}
        <div className="flex gap-4 sm:gap-8 justify-center w-full relative">
           <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hidden sm:block">R</div>
           <div className="flex justify-end">{renderQuadrant(q1, true)}</div>
           <div className="w-px bg-slate-300"></div>
           <div className="flex justify-start">{renderQuadrant(q2, false)}</div>
        </div>

        {/* Divider text */}
        <div className="w-full flex items-center gap-4 text-xs font-mono text-slate-400 px-4">
          <div className="h-px bg-slate-300 flex-1"></div>
          <span>UPPER</span>
          <div className="h-px bg-slate-300 w-8"></div>
          <span>LOWER</span>
          <div className="h-px bg-slate-300 flex-1"></div>
        </div>

        {/* LOWER */}
        <div className="flex gap-4 sm:gap-8 justify-center w-full relative">
           <div className="absolute left-0 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hidden sm:block">R</div>
           <div className="flex justify-end">{renderQuadrant(q4, true)}</div>
           <div className="w-px bg-slate-300"></div>
           <div className="flex justify-start">{renderQuadrant(q3, false)}</div>
        </div>
      </div>

      {/* Input Field */}
      <div className="flex gap-2 mt-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Or type: 11 12 21 22" 
          className="flex-1 p-3 bg-white border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-primary transition-colors"
        />
        <button 
          onClick={() => { setInputText(''); onChange([]) }}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
