/**
 * ErrorMessage Component
 * Reusable error display
 */

import React from 'react';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';

export const ErrorMessage = ({ 
  message = 'Something went wrong', 
  onRetry,
  fullPage = false 
}) => {
  const containerClass = fullPage 
    ? 'flex items-center justify-center min-h-screen bg-gray-50'
    : 'flex items-center justify-center min-h-[300px]';

  return (
    <div className={containerClass}>
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <ExclamationCircleOutlined className="text-4xl text-red-600" />
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h3>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            <ReloadOutlined />
            Try Again
          </button>
        )}
        
        <p className="text-sm text-gray-500 mt-4">
          If the problem persists, please contact support.
        </p>
      </div>
    </div>
  );
};

export const InlineError = ({ message }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <ExclamationCircleOutlined className="text-red-600 text-lg mt-0.5" />
      <div>
        <p className="text-red-800 font-medium">Error</p>
        <p className="text-red-600 text-sm mt-1">{message}</p>
      </div>
    </div>
  );
};
