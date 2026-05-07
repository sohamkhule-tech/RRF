'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFormConfig, updateFormConfig, createFormConfig, deleteFormConfig } from '@/lib/api/formConfig';
import { toast } from 'react-hot-toast';
import { FormOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, RightOutlined, CheckCircleOutlined, ArrowLeftOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import FunctionManager from './FunctionManager';

// Auto-generate field name from label
const generateFieldName = (label) => {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .map((word, i) =>
      i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('')
}

function FormConfigEditor({ config, onSave, onDelete }) {
  const [label, setLabel] = useState(config.label);
  const [options, setOptions] = useState([...config.options]);
  const [currentOption, setCurrentOption] = useState('');
  const [isRequired, setIsRequired] = useState(config.isRequired || false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    setLabel(config.label);
    setOptions([...config.options]);
    setIsRequired(config.isRequired || false);
    setCurrentOption('');
    setEditingIndex(null);
    setEditingValue('');
  }, [config]);

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(options[index]);
  };

  const handleSaveEdit = (index) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      toast.error('Option cannot be empty');
      return;
    }
    if (options.some((o, i) => i !== index && o === trimmed)) {
      toast.error('Option already exists');
      return;
    }
    setOptions(options.map((o, i) => (i === index ? trimmed : o)));
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleAddOption = () => {
    const trimmed = currentOption.trim();
    if (!trimmed) {
      toast.error('Option cannot be empty');
      return;
    }
    if (options.includes(trimmed)) {
      toast.error('Option already exists');
      return;
    }
    setOptions([...options, trimmed]);
    setCurrentOption('');
  };

  const handleDeleteOption = (index) => {
    if (options.length <= 1) {
      toast.error('Must have at least one option');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error('Label cannot be empty');
      return;
    }
    if (options.length === 0) {
      toast.error('Must have at least one option');
      return;
    }

    setSaving(true);
    try {
      await updateFormConfig(config.fieldName, { 
        label, 
        options, 
        isRequired,
        // Ensure step is preserved/updated correctly
        step: (config.fieldName === 'primaryTechnologies' || config.fieldName === 'technologies') ? 3 : config.step,
        section: (config.fieldName === 'primaryTechnologies' || config.fieldName === 'technologies') ? 'Technical Requirements' : config.section
      });
      toast.success(`${config.label} updated successfully`);
      if (onSave) onSave();
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async () => {
    if (!window.confirm(`Are you sure you want to delete the configuration for "${config.label}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteFormConfig(config.fieldName);
      toast.success(`${config.label} deleted successfully`);
      if (onDelete) onDelete();
    } catch (error) {
      toast.error('Failed to delete field');
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Field Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800 text-sm">{config.label}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {config.step === 1 ? 'Step 1' : config.step === 2 ? 'Step 2' : 'Step 3'}
          </span>
          <button
            onClick={handleDeleteField}
            disabled={deleting}
            className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
            title="Delete this field"
          >
            <DeleteOutlined fontSize="small" />
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">Field Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Enter field label"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">Dropdown Options</label>
        
        {/* Options List */}
        <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-2 border border-gray-200">
          {options.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No options added yet</p>
          ) : (
            options.map((option, index) => (
              <div key={index} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-gray-200 hover:border-indigo-300 transition-colors">
                {editingIndex === index ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(index);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleSaveEdit(index)}
                      className="text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors p-1.5 rounded"
                      title="Save"
                    >
                      <CheckCircleOutlined className="text-xs" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors p-1.5 rounded"
                      title="Cancel"
                    >
                      <CloseOutlined className="text-xs" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-700">{option}</span>
                    <button
                      onClick={() => handleStartEdit(index)}
                      className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors p-1.5 rounded"
                      title="Edit option"
                    >
                      <EditOutlined className="text-xs" />
                    </button>
                    <button
                      onClick={() => handleDeleteOption(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors p-1.5 rounded"
                      title="Delete option"
                    >
                      <CloseOutlined className="text-xs" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add New Option */}
        <div className="flex gap-2">
          <input
            type="text"
            value={currentOption}
            onChange={(e) => setCurrentOption(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Type option and press Enter"
          />
          <button
            onClick={handleAddOption}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-xs flex items-center gap-1.5 font-medium"
          >
            <PlusOutlined /> Add
          </button>
        </div>
      </div>

      {/* Mandatory Toggle */}
      <div className="mb-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <input
          type="checkbox"
          id={`required-${config.fieldName}`}
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor={`required-${config.fieldName}`} className="text-sm font-medium text-gray-700 cursor-pointer">
          Mandatory Field <span className="text-xs text-gray-500">(required in RRF form)</span>
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 ${
          saving
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
        }`}
      >
        <SaveOutlined />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

export default function FormConfig() {
  const router = useRouter();
  const { user } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldData, setNewFieldData] = useState({
    label: '',
    type: 'dropdown',
    options: [],
    isRequired: false,
    step: 1,
    section: 'General'
  });
  const [currentNewOption, setCurrentNewOption] = useState('');

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await fetchFormConfig();
      
      // Debug logging
      console.log('[Form Config] User Role:', user?.role);
      console.log('[Form Config] Fetched configs:', data.length, 'fields');
      console.log('[Form Config] Field names:', data.map(f => f.fieldName).join(', '));
      
      // NO FILTERING - Show ALL fields to ALL users for consistent UI
      // Both Admin and PMO see the same fields
      setConfigs(data);
    } catch (error) {
      toast.error('Failed to load configurations');
      console.error('[Form Config] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading configurations...</p>
        </div>
      </div>
    );
  }

  // Group configs by step and section
  const groupedConfigs = configs.reduce((acc, config) => {
    // Determine the effective step and section for the field
    let step = config.step || 1;
    let section = config.section || 'General';
    
    // Explicitly force primaryTechnologies and technologies to Step 3
    if (config.fieldName === 'primaryTechnologies' || config.fieldName === 'technologies') {
      step = 3;
      section = 'Technical Requirements';
    }

    const stepKey = `step${step}`;
    if (!acc[stepKey]) acc[stepKey] = {};
    if (!acc[stepKey][section]) acc[stepKey][section] = [];
    acc[stepKey][section].push(config);
    return acc;
  }, {});

  const steps = [
    { number: 1, title: 'Requisition Details', key: 'step1' },
    { number: 2, title: 'Position Details', key: 'step2' },
    { number: 3, title: 'Technical Requirements', key: 'step3' },
  ];

  const currentStepData = groupedConfigs[`step${currentStep}`] || {};

  // Dynamic back navigation based on user role
  const getBackPath = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'PMO') return '/pmo';
    return '/'; // fallback
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <FormOutlined className="text-xl md:text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Edit RRF Form</h1>
                <p className="text-gray-600 mt-1 text-sm md:text-base">Configure dynamic fields for each step of the RRF workflow</p>
              </div>
            </div>
            
            <button
              onClick={() => router.push(getBackPath())}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm font-medium text-sm self-start sm:self-auto"
            >
              <ArrowLeftOutlined />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>

          {/* Step Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-6 sm:py-3 rounded-lg transition-all ${
                    currentStep === step.number
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${
                    currentStep === step.number ? 'bg-white text-indigo-600' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.number}
                  </div>
                  <span className="font-semibold text-sm sm:text-base hidden sm:inline">{step.title}</span>
                  <span className="font-semibold text-sm sm:hidden">Step {step.number}</span>
                </button>
                {index < steps.length - 1 && (
                  <RightOutlined className="mx-2 sm:mx-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="space-y-6">
          {Object.entries(currentStepData).map(([section, fields]) => (
            <div key={section} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircleOutlined className="text-indigo-500" />
                {section}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {fields.map((config) => {
                  // Safe filtering: Skip old static Function/SubFunction editors
                  const fieldKey = config.name || config.fieldName;
                  if (fieldKey === 'function' || fieldKey === 'subFunction') {
                    return null;
                  }
                  return (
                    <FormConfigEditor 
                      key={config.fieldName} 
                      config={config} 
                      onSave={loadConfigs} 
                      onDelete={loadConfigs}
                    />
                  );
                })}
                
                {/* Inject FunctionManager into Organization section grid */}
                {section === 'Organization' && <FunctionManager />}
              </div>
            </div>
          ))}

          {Object.keys(currentStepData).length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
              <p className="text-yellow-800 font-medium">No configurations found for this step</p>
            </div>
          )}
        </div>

        {/* Add New Field Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAddFieldModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2 mx-auto"
          >
            <PlusOutlined className="text-lg" />
            Add New Field to Step {currentStep}
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-6 md:mt-8 p-4 md:p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Configuration Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Changes apply immediately to all RRF forms</li>
            <li>• Existing RRF records retain their original values</li>
            <li>• Mark fields as "Mandatory" to require them in RRF submissions</li>
            <li>• Add new fields dynamically - field names are auto-generated</li>
            <li>• All form fields are displayed (both system and custom fields)</li>
            <li>• Use the dynamic option builder to add/remove dropdown choices</li>
          </ul>
        </div>

        {/* Add Field Modal */}
        {showAddFieldModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                <h3 className="text-xl font-bold text-gray-900">Add New Field</h3>
                <p className="text-sm text-gray-600 mt-1">Create a new dynamic field for Step {currentStep}</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Display Label */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Field Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFieldData.label}
                    onChange={(e) => setNewFieldData({ ...newFieldData, label: e.target.value })}
                    placeholder="e.g., Business Unit, Department, Cost Center"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be shown to users in the form</p>
                </div>

                {/* Field Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Field Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newFieldData.type}
                    onChange={(e) => setNewFieldData({ ...newFieldData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  >
                    <option value="dropdown">Dropdown (Select)</option>
                    <option value="text">Text Input</option>
                  </select>
                </div>

                {/* Options (for dropdown) */}
                {newFieldData.type === 'dropdown' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dropdown Options <span className="text-red-500">*</span>
                    </label>
                    
                    {/* Options List */}
                    <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-2 border border-gray-200">
                      {newFieldData.options.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No options added yet</p>
                      ) : (
                        newFieldData.options.map((option, index) => (
                          <div key={index} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-gray-200">
                            <span className="text-sm text-gray-700">{option}</span>
                            <button
                              onClick={() => {
                                setNewFieldData({
                                  ...newFieldData,
                                  options: newFieldData.options.filter((_, i) => i !== index)
                                })
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                            >
                              <CloseOutlined className="text-xs" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add New Option */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentNewOption}
                        onChange={(e) => setCurrentNewOption(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const trimmed = currentNewOption.trim()
                            if (trimmed && !newFieldData.options.includes(trimmed)) {
                              setNewFieldData({ ...newFieldData, options: [...newFieldData.options, trimmed] })
                              setCurrentNewOption('')
                            }
                          }
                        }}
                        placeholder="Type option and press Enter"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      />
                      <button
                        onClick={() => {
                          const trimmed = currentNewOption.trim()
                          if (trimmed && !newFieldData.options.includes(trimmed)) {
                            setNewFieldData({ ...newFieldData, options: [...newFieldData.options, trimmed] })
                            setCurrentNewOption('')
                          }
                        }}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-xs flex items-center gap-1.5 font-medium"
                      >
                        <PlusOutlined /> Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newFieldData.section}
                    onChange={(e) => setNewFieldData({ ...newFieldData, section: e.target.value })}
                    placeholder="e.g., General, Project Details"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Mandatory Toggle */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="newFieldRequired"
                    checked={newFieldData.isRequired}
                    onChange={(e) => setNewFieldData({ ...newFieldData, isRequired: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="newFieldRequired" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Make this field mandatory
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewFieldData({
                      label: '',
                      type: 'dropdown',
                      options: [],
                      isRequired: false,
                      step: currentStep,
                      section: 'General'
                    });
                    setCurrentNewOption('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newFieldData.label) {
                      toast.error('Field label is required');
                      return;
                    }
                    if (newFieldData.type === 'dropdown' && newFieldData.options.length === 0) {
                      toast.error('Add at least one option for dropdown');
                      return;
                    }
                    try {
                      const fieldName = generateFieldName(newFieldData.label);
                      
                      await createFormConfig({
                        ...newFieldData,
                        fieldName
                      });
                      
                      toast.success(`Field "${newFieldData.label}" added successfully`);
                      
                      setShowAddFieldModal(false);
                      setNewFieldData({
                        label: '',
                        type: 'dropdown',
                        options: [],
                        isRequired: false,
                        step: currentStep,
                        section: 'General'
                      });
                      setCurrentNewOption('');
                      loadConfigs();
                    } catch (error) {
                      toast.error('Failed to create field');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors font-medium text-sm"
                >
                  Create Field
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
