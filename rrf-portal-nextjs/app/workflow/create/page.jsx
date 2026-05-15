'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'
import ModernRRFForm from '@/components/ModernRRFForm'
import { useAuth } from '@/contexts/AuthContext'

export default function WorkflowCreatePage() {
  const { user } = useAuth()
  const roleCode = String(user?.role?.code || user?.role || 'hiring-manager').toLowerCase()

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.RRF.CREATE}>
      <ModernRRFForm userRole={roleCode} cancelPath="/workflow?view=my-requests" />
    </ProtectedRoute>
  )
}
