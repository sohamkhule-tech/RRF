'use client'

import ProtectedRoute from '@/components/ProtectedRoute';
import FormConfig from '@/components/FormConfig';

// Admin Form Config page - uses Admin layout
export default function AdminFormConfigPage() {
  return (
    <ProtectedRoute>
      <FormConfig />
    </ProtectedRoute>
  );
}
