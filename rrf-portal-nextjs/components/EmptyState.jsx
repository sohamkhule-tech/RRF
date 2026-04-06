/**
 * EmptyState Component
 * Reusable empty state display
 */

import React from 'react';
import Link from 'next/link';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';

export const EmptyState = ({
  icon: Icon = FileTextOutlined,
  title = 'No data found',
  description = 'Get started by creating a new item',
  actionText,
  actionHref,
  onAction,
}) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md px-6">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon className="text-5xl text-gray-400" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {description}
        </p>
        
        {(actionText && (actionHref || onAction)) && (
          <>
            {actionHref ? (
              <Link href={actionHref}>
                <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 mx-auto shadow-lg">
                  <PlusOutlined />
                  {actionText}
                </button>
              </Link>
            ) : (
              <button
                onClick={onAction}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 mx-auto shadow-lg"
              >
                <PlusOutlined />
                {actionText}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const EmptyTableState = ({ message = 'No records found' }) => {
  return (
    <div className="text-center py-12">
      <FileTextOutlined className="text-6xl text-gray-300 mb-4" />
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
};
