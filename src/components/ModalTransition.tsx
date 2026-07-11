'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

type ModalTransitionProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function ModalTransition({ isOpen, onClose, children }: ModalTransitionProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
