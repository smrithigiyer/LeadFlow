import { useState, useEffect } from 'react'
import { userApi } from '../utils/api'

export function useUsers() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    userApi.getAll()
      .then((r) => setUsers((r.data.data || []).filter((u) => u.isActive)))
      .catch(() => {})
  }, [])
  return users
}
