/**
 * Loading Component
 * Reusable loading spinner
 */

import React from 'react';

export const LoadingSpinner = ({ message = 'Loading...', size = 'default' }) => {
  const sizeClasses = {
    small: 'h-8 w-8 border-2',
    default: 'h-16 w-16 border-4',
    large: 'h-24 w-24 border-4',
  };

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <div
          className={`${sizeClasses[size]} mx-auto animate-spin rounded-full border-indigo-600 border-t-transparent`}
        ></div>
        {message && (
          <p className="mt-4 text-gray-600 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

export const TableLoadingSkeleton = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-10 bg-gray-200 rounded flex-1"
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardLoadingSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  );
};
