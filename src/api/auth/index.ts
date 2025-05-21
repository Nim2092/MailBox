import axios from 'axios'

export const refreshAccessToken = async () => {
  const response = await axios.get('/api/v1/auth/refresh-token', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('refresh_token')}`
    }
  })
  return response.data
}