import React, { useEffect } from 'react'

interface SimpleToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

const SimpleToast: React.FC<SimpleToastProps> = ({ 
  message, 
  type = 'success', 
  duration = 3000, 
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = 
    type === 'success' ? 'bg-green-500 dark:bg-green-600' : 
    type === 'error' ? 'bg-red-500 dark:bg-red-600' : 
    'bg-blue-500 dark:bg-blue-600'

  return (
    <div 
      className={`fixed top-4 right-4 z-50 p-3 rounded-md shadow-lg text-white 
        ${bgColor} transform transition-transform duration-300 ease-in-out`}
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button 
          className="ml-4 text-white opacity-75 hover:opacity-100"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default SimpleToast 