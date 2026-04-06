'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'
import ModernRRFForm from '@/components/ModernRRFForm'

export default function CreateRRFPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.RRF.CREATE}>
      <ModernRRFForm userRole="hiring-manager" />
    </ProtectedRoute>
  )
}
