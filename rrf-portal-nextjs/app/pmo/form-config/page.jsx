'use client'

import ProtectedRoute from '@/components/ProtectedRoute';
import FormConfig from '@/components/FormConfig';

// PMO Form Config page - uses PMO layout
export default function PMOFormConfigPage() {
  return (
    <ProtectedRoute>
      <FormConfig />
    </ProtectedRoute>
  );
}
