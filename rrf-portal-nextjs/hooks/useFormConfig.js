'use client'

import { useCallback } from 'react';
import { fetchFormConfig } from '@/lib/api/formConfig';
import { useSmartFetch } from '@/lib/useSmartFetch';
import { CACHE_TTL } from '@/lib/apiCache';

// Default fallback configurations
const DEFAULT_CONFIGS = {
  entity: { fieldName: 'entity', label: 'Entity', options: ['DataFortune Inc', 'Techfortune Inc'], step: 1, section: 'Organization' },
  function: { fieldName: 'function', label: 'Function', options: ['Delivery', 'Sales', 'Support'], step: 1, section: 'Organization' },
  subFunction: { 
    fieldName: 'subFunction', 
    label: 'Sub Function', 
    options: ['SGINTL', 'VR', 'PMO', 'BDE', 'Sales', 'MR', 'Marketing', 'Human Resources', 'Talent Acquisition', 'Accounts', 'IT Networking'], 
    step: 1, 
    section: 'Organization' 
  },
  requisitionType: { fieldName: 'requisitionType', label: 'Requisition Type', options: ['Billable', 'Non-Billable'], step: 1, section: 'Request Type' },
  nonBillableSubType: { fieldName: 'nonBillableSubType', label: 'Non-Billable Sub Type', options: ['Bench', 'Pipeline'], step: 1, section: 'Request Type' },
  positionType: { fieldName: 'positionType', label: 'Position Type', options: ['New Position', 'Replacement', 'Additional'], step: 2, section: 'Position Information' },
  employmentType: { fieldName: 'employmentType', label: 'Employment Type', options: ['Full-time', 'Part-time', 'Contract'], step: 2, section: 'Position Information' },
  priority: { fieldName: 'priority', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'], step: 2, section: 'Position Information' },
  workMode: { fieldName: 'workMode', label: 'Work Mode', options: ['Remote', 'Hybrid', 'On-site'], step: 2, section: 'Position Information' },
  location: { fieldName: 'location', label: 'Location', options: ['Pune', 'Chennai', 'Bengaluru', 'US', 'Other'], step: 2, section: 'Position Information' },
};

const transform = (data) => {
  try {
    // Convert array to object keyed by fieldName
    const configsMap = {};
    data.forEach((config) => {
      configsMap[config.fieldName] = config;
    });

    // Merge: Start with defaults, then add ALL configs from API
    // This ensures all dynamically fetched fields are included
    const mergedConfigs = { ...DEFAULT_CONFIGS, ...configsMap };

    // Debug logging
    console.log('🔍 Form Config API Response:', data);
    console.log('📊 Transformed Configs:', mergedConfigs);
    console.log('🔑 Config Keys:', Object.keys(mergedConfigs));

    return mergedConfigs;
  } catch (error) {
    console.error('❌ Form Config Transform Error:', error);
    return DEFAULT_CONFIGS;
  }
};

export function useFormConfig() {
  const { data: configs, loading, error } = useSmartFetch(
    'form-config',
    fetchFormConfig,
    { ttl: CACHE_TTL.CONFIG, transform },
  );

  const effectiveConfigs = configs ?? DEFAULT_CONFIGS;

  return {
    configs: effectiveConfigs,
    loading,
    error,
    getConfig: (fieldName) => effectiveConfigs[fieldName] || DEFAULT_CONFIGS[fieldName],
  };
}
