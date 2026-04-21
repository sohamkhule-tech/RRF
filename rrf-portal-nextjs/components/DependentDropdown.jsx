'use client'

import { useState, useEffect } from 'react';
import { functionsApi } from '@/lib/api/functionsApi';
import toast from 'react-hot-toast';

/**
 * DependentDropdown Component
 * 
 * Handles Function → SubFunction dependent dropdown logic
 * 
 * Features:
 * - Fetches functions from API
 * - Fetches subfunctions based on selected function
 * - Supports both ID-based (new) and name-based (old) formats
 * - Backward compatible with existing forms
 * 
 * Props:
 * - functionValue: Selected function ID or name
 * - subfunctionValue: Selected subfunction ID or name
 * - onFunctionChange: (id, name) => void
 * - onSubfunctionChange: (id, name) => void
 * - disabled: boolean
 * - required: boolean
 * - mode: 'id' | 'name' (default: 'id') - determines what to pass to callbacks
 */
export default function DependentDropdown({
  functionValue,
  subfunctionValue,
  onFunctionChange,
  onSubfunctionChange,
  disabled = false,
  required = false,
  mode = 'id', // 'id' for new format, 'name' for backward compatibility
  showLabels = true,
  className = '',
}) {
  const [functions, setFunctions] = useState([]);
  const [subfunctions, setSubfunctions] = useState([]);
  const [loadingFunctions, setLoadingFunctions] = useState(true);
  const [loadingSubfunctions, setLoadingSubfunctions] = useState(false);

  // Load all functions on mount
  useEffect(() => {
    loadFunctions();
  }, []);

  // Load subfunctions when function changes
  useEffect(() => {
    if (functionValue) {
      loadSubfunctions(functionValue);
    } else {
      setSubfunctions([]);
    }
  }, [functionValue]);

  const loadFunctions = async () => {
    try {
      // Requirement 5: Ensure Token Exists Before Calling API
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[DependentDropdown] No auth token found. Skipping functions load.');
        setLoadingFunctions(false);
        return;
      }

      setLoadingFunctions(true);
      const response = await functionsApi.getAll();
      setFunctions(response.data || []);
    } catch (error) {
      console.error('[DependentDropdown] Failed to load functions:', error);
      // Only show error toast if it's not a 401 (which is handled by apiConfig)
      if (!error.message?.includes('401') && !error.message?.includes('expired')) {
        toast.error('Failed to load functions');
      }
      setFunctions([]);
    } finally {
      setLoadingFunctions(false);
    }
  };

  const loadSubfunctions = async (functionIdOrName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoadingSubfunctions(true);

      // Find function by ID or name
      let functionId = functionIdOrName;
      
      if (typeof functionIdOrName === 'string' && isNaN(functionIdOrName)) {
        // It's a name, find the ID
        const functionEntity = functions.find(f => f.name === functionIdOrName);
        if (functionEntity) {
          functionId = functionEntity.id;
        } else {
          console.warn('[DependentDropdown] Function not found:', functionIdOrName);
          setSubfunctions([]);
          return;
        }
      }

      const response = await functionsApi.getSubfunctions(functionId);
      setSubfunctions(response.data || []);
    } catch (error) {
      console.error('[DependentDropdown] Failed to load subfunctions:', error);
      setSubfunctions([]);
    } finally {
      setLoadingSubfunctions(false);
    }
  };

  const handleFunctionChange = (e) => {
    const selectedId = e.target.value;
    
    if (!selectedId) {
      onFunctionChange(null, '');
      return;
    }

    const selectedFunction = functions.find(f => f.id === parseInt(selectedId));
    
    if (selectedFunction) {
      // Pass ID and name based on mode
      if (mode === 'id') {
        onFunctionChange(selectedFunction.id, selectedFunction.name);
      } else {
        onFunctionChange(selectedFunction.name, selectedFunction.name);
      }
    }
  };

  const handleSubfunctionChange = (e) => {
    const selectedId = e.target.value;
    
    if (!selectedId) {
      onSubfunctionChange(null, '');
      return;
    }

    const selectedSubfunction = subfunctions.find(sf => sf.id === parseInt(selectedId));
    
    if (selectedSubfunction) {
      // Pass ID and name based on mode
      if (mode === 'id') {
        onSubfunctionChange(selectedSubfunction.id, selectedSubfunction.name);
      } else {
        onSubfunctionChange(selectedSubfunction.name, selectedSubfunction.name);
      }
    }
  };

  // Find current function ID for value
  const getCurrentFunctionId = () => {
    if (!functionValue) return '';
    
    if (typeof functionValue === 'number') {
      return functionValue.toString();
    }
    
    // If it's a name, find the ID
    const functionEntity = functions.find(f => f.name === functionValue);
    return functionEntity ? functionEntity.id.toString() : '';
  };

  // Find current subfunction ID for value
  const getCurrentSubfunctionId = () => {
    if (!subfunctionValue) return '';
    
    if (typeof subfunctionValue === 'number') {
      return subfunctionValue.toString();
    }
    
    // If it's a name, find the ID
    const subfunctionEntity = subfunctions.find(sf => sf.name === subfunctionValue);
    return subfunctionEntity ? subfunctionEntity.id.toString() : '';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Function Dropdown */}
      <div>
        {showLabels && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Function {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <select
          value={getCurrentFunctionId()}
          onChange={handleFunctionChange}
          disabled={disabled || loadingFunctions}
          required={required}
          className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingFunctions ? 'Loading functions...' : 'Select Function'}
          </option>
          {functions.map((func) => (
            <option key={func.id} value={func.id}>
              {func.name}
            </option>
          ))}
        </select>
      </div>

      {/* SubFunction Dropdown */}
      <div>
        {showLabels && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sub Function {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <select
          value={getCurrentSubfunctionId()}
          onChange={handleSubfunctionChange}
          disabled={disabled || !functionValue || loadingSubfunctions}
          required={required}
          className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {!functionValue
              ? 'Select Function first'
              : loadingSubfunctions
              ? 'Loading subfunctions...'
              : 'Select Sub Function'}
          </option>
          {subfunctions.map((subFunc) => (
            <option key={subFunc.id} value={subFunc.id}>
              {subFunc.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
