import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const HomePage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to accounts page
    navigate('/accounts')
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Redirecting to accounts...</p>
      </div>
    </div>
  )
}

export default HomePage 