'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { fetchFormConfig, updateFormConfig } from '@/lib/api/formConfig';
import { toast } from 'react-hot-toast';
import { FormOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, RightOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
function FormConfigEditor({ config, onSave }) {
  const [label, setLabel] = useState(config.label);
  const [options, setOptions] = useState([...config.options]);
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLabel(config.label);
    setOptions([...config.options]);
  }, [config]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) {
      toast.error('Option cannot be empty');
      return;
    }
    if (options.includes(trimmed)) {
      toast.error('Option already exists');
      return;
    }
    setOptions([...options, trimmed]);
    setNewOption('');
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
      await updateFormConfig(config.fieldName, { label, options });
      toast.success(`${config.label} updated successfully`);
      if (onSave) onSave();
    } catch (error) {
      toast.error('Failed to save configuration');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <h4 className="font-semibold text-gray-800 mb-4 text-sm">{config.fieldName}</h4>
      
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
        <label className="block text-xs font-medium text-gray-600 mb-2">Options</label>
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
              <span className="flex-1 text-gray-700">{option}</span>
              <button
                onClick={() => handleDeleteOption(index)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="Delete"
              >
                <DeleteOutlined className="text-xs" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Add option"
          />
          <button
            onClick={handleAddOption}
            className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-xs flex items-center gap-1"
          >
            <PlusOutlined /> Add
          </button>
        </div>
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

function FormConfigPageContent() {
  const router = useRouter();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await fetchFormConfig();
      setConfigs(data);
    } catch (error) {
      toast.error('Failed to load configurations');
      console.error('Load error:', error);
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
    const stepKey = `step${config.step || 1}`;
    const section = config.section || 'General';
    if (!acc[stepKey]) acc[stepKey] = {};
    if (!acc[stepKey][section]) acc[stepKey][section] = [];
    acc[stepKey][section].push(config);
    return acc;
  }, {});

  const steps = [
    { number: 1, title: 'Requisition Details', key: 'step1' },
    { number: 2, title: 'Position Details', key: 'step2' },
  ];

  const currentStepData = groupedConfigs[`step${currentStep}`] || {};

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
              onClick={() => router.push('/pmo')}
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
                {fields.map((config) => (
                  <FormConfigEditor key={config.fieldName} config={config} onSave={loadConfigs} />
                ))}
              </div>
            </div>
          ))}

          {Object.keys(currentStepData).length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
              <p className="text-yellow-800 font-medium">No configurations found for this step</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 md:mt-8 p-4 md:p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Configuration Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Changes apply immediately to all RRF forms</li>
            <li>• Existing RRF records retain their original values</li>
            <li>• SubFunction options are shared across all Functions (dependency handled in form logic)</li>
            <li>• Location supports multi-select in the RRF form</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function FormConfigPage() {
  return (
    <ProtectedRoute>
      <FormConfigPageContent />
    </ProtectedRoute>
  );
}
