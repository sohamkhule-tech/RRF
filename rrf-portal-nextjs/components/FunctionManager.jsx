'use client'

import { useState, useEffect, useCallback } from 'react';
import { functionsApi, subfunctionsApi } from '@/lib/api/functionsApi';
import { fetchFormConfig, updateFormConfig } from '@/lib/api/formConfig';
import { toast } from 'react-hot-toast';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  CloseOutlined, 
  EnvironmentOutlined,
  AppstoreOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
  DownOutlined
} from '@ant-design/icons';

export default function FunctionManager() {
  const [functions, setFunctions] = useState([]);
  const [unassignedSubfunctions, setUnassignedSubfunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States for adding/editing
  const [newFunctionName, setNewFunctionName] = useState('');
  const [editingFunctionId, setEditingFunctionId] = useState(null);
  const [editFunctionName, setEditFunctionName] = useState('');
  const [addingSubToFuncId, setAddingSubToFuncId] = useState(null);
  const [newSubName, setNewSubName] = useState('');
  
  const [isRequired, setIsRequired] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchFunctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await functionsApi.getAll();
      const data = res?.data || res || [];
      setFunctions(data);

      const unassigned = await functionsApi.getUnassigned();
      setUnassignedSubfunctions(unassigned?.data || unassigned || []);
      
      // Fetch mandatory status from form config
      const formConfigs = await fetchFormConfig();
      const functionConfig = formConfigs.find(c => c.fieldName === 'function');
      if (functionConfig) {
        setIsRequired(functionConfig.isRequired);
      }
    } catch (err) {
      console.error('[FunctionManager] Fetch error:', err);
      setError("Failed to load functions.");
      toast.error('Could not load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunctions();
  }, [fetchFunctions]);

  // --- ACTIONS ---

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save mandatory status to both function and subFunction configs
      await updateFormConfig('function', { isRequired });
      await updateFormConfig('subFunction', { isRequired });
      
      toast.success('Function configuration saved successfully');
    } catch (e) {
      console.error('[FunctionManager] Save error:', e);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFunction = async () => {
    const cleaned = newFunctionName.trim();
    if (!cleaned) return;
    if (functions.some(f => f.name.toLowerCase() === cleaned.toLowerCase())) {
      toast.error("Function already exists");
      return;
    }

    try {
      const res = await functionsApi.create({ name: cleaned });
      const newFunc = res.data || res;
      setFunctions(prev => [...prev, { ...newFunc, subfunctions: [] }]);
      setNewFunctionName('');
      toast.success('Function added');
    } catch (err) {
      toast.error('Failed to add');
    }
  };

  const startEditFunction = (func) => {
    setEditingFunctionId(func.id);
    setEditFunctionName(func.name);
  };

  const handleUpdateFunction = async (id) => {
    const cleaned = editFunctionName.trim();
    if (!cleaned) return;
    try {
      const res = await functionsApi.update(id, { name: cleaned });
      const updated = res.data || res;
      setFunctions(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
      setEditingFunctionId(null);
      toast.success('Updated');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDeleteFunction = async (func) => {
    if (func.subfunctions?.length > 0) {
      toast.error("Remove subfunctions first");
      return;
    }
    if (!confirm(`Delete function "${func.name}"?`)) return;
    try {
      await functionsApi.delete(func.id);
      setFunctions(prev => prev.filter(f => f.id !== func.id));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleAddSubfunction = async (functionId) => {
    const cleaned = newSubName.trim();
    if (!cleaned) return;
    try {
      const res = await subfunctionsApi.create({ name: cleaned, functionId });
      const newSubData = res.data || res;
      setFunctions(prev => prev.map(f => f.id === functionId ? { ...f, subfunctions: [...(f.subfunctions || []), newSubData] } : f));
      setAddingSubToFuncId(null);
      setNewSubName('');
      toast.success('SubFunction added');
    } catch (err) {
      toast.error('Failed to add subfunction');
    }
  };

  const handleDeleteSubfunction = async (subId) => {
    if (!confirm("Delete this sub-function?")) return;
    try {
      await subfunctionsApi.delete(subId);
      setFunctions(prev => prev.map(f => ({ ...f, subfunctions: f.subfunctions?.filter(sf => sf.id !== subId) || [] })));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (loading && functions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 min-h-[250px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-xs text-gray-500">Loading configurations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 min-h-[250px] flex flex-col items-center justify-center">
        <ExclamationCircleOutlined className="text-red-500 mb-2 text-xl" />
        <p className="text-xs text-red-700 font-medium pb-2">Failed to load functions</p>
        <button onClick={fetchFunctions} className="text-xs text-indigo-600 font-bold hover:underline">Try Again</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Field Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800 text-sm">Function</h4>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Step 1</span>
      </div>
      
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">Field Label</label>
        <input
          type="text"
          value="Function"
          disabled
          className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">Dropdown Options</label>
        
        {/* Options List - MATCHING FormConfigEditor exactly */}
        <div className="space-y-1.5 mb-3 max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-2 border border-gray-200">
          {functions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No functions added yet</p>
          ) : (
            functions.map((func) => (
              <div key={func.id} className="space-y-1.5">
                {/* Function Item */}
                <div className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-gray-200 hover:border-indigo-300 transition-colors">
                  {editingFunctionId === func.id ? (
                    <input
                      autoFocus
                      type="text"
                      className="flex-1 text-sm bg-indigo-50/50 px-1 rounded outline-none"
                      value={editFunctionName}
                      onChange={(e) => setEditFunctionName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateFunction(func.id)}
                    />
                  ) : (
                    <span className="flex-1 text-sm text-gray-700 font-medium">{func.name}</span>
                  )}
                  <div className="flex items-center gap-1">
                    {editingFunctionId === func.id ? (
                      <button onClick={() => handleUpdateFunction(func.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded"><SaveOutlined className="text-xs"/></button>
                    ) : (
                      <button onClick={() => startEditFunction(func)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded"><EditOutlined className="text-xs"/></button>
                    )}
                    <button onClick={() => handleDeleteFunction(func)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><CloseOutlined className="text-xs"/></button>
                  </div>
                </div>

                {/* Sub-Functions - INDENTED FLAT LIST */}
                {func.subfunctions?.map(sf => (
                  <div key={sf.id} className="ml-4 flex items-center justify-between gap-2 p-2 bg-white rounded border border-gray-200 hover:border-indigo-300 transition-colors">
                    <span className="flex-1 text-[13px] text-gray-600 italic">└ {sf.name}</span>
                    <button onClick={() => handleDeleteSubfunction(sf.id)} className="text-red-400 hover:bg-red-50 p-1 rounded"><CloseOutlined className="text-[10px]"/></button>
                  </div>
                ))}

                {/* Inline Add Sub-function */}
                <div className="ml-4 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 text-[12px] border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400 outline-none"
                    placeholder={`Add to ${func.name}...`}
                    value={addingSubToFuncId === func.id ? newSubName : ''}
                    onChange={(e) => {setAddingSubToFuncId(func.id); setNewSubName(e.target.value);}}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubfunction(func.id)}
                  />
                  <button onClick={() => handleAddSubfunction(func.id)} className="text-[10px] text-indigo-500 font-bold hover:underline">Add</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New Function */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFunctionName}
            onChange={(e) => setNewFunctionName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddFunction()}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Type function and press Enter"
          />
          <button
            onClick={handleAddFunction}
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
          id="required-functions"
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="required-functions" className="text-sm font-medium text-gray-700 cursor-pointer">
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
