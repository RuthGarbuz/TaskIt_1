import { useState } from 'react';
import type { GeneralSettingsData, SystemTablesData, StatusItem, PriorityItem } from '../Data/settingsData';

export const useGeneralSettings = (initialData: GeneralSettingsData) => {
  const [settings, setSettings] = useState<GeneralSettingsData>(initialData);

  const updateSetting = <K extends keyof GeneralSettingsData>(
    key: K,
    value: GeneralSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(initialData);
  };

  return {
    settings,
    updateSetting,
    setSettings,
    resetSettings
  };
};

export const useSystemTables = (initialData: SystemTablesData) => {
  const [statuses, setStatuses] = useState<StatusItem[]>(initialData.statuses);
  const [priorities, setPriorities] = useState<PriorityItem[]>(initialData.priorities);

  // Status functions
  const addStatus = (name: string, color: string, progressPercentage: number = 0) => {
    if (name.trim()) {
      setStatuses([...statuses, {
        id: Date.now(),
        name: name.trim(),
        color,
        progressPercentage,
        isDefault: false,
        isActive: true
      }]);
    }
  };

  const updateStatus = (id: number, field: keyof StatusItem, value: any) => {
    setStatuses(statuses.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const deleteStatus = (id: number) => {
    setStatuses(statuses.filter(s => s.id !== id));
  };

  // Priority functions
  const addPriority = (name: string, color: string) => {
    if (name.trim()) {
      setPriorities([...priorities, {
        id: Date.now(),
        name: name.trim(),
        color,
        isDefault: false,
        isActive: true
      }]);
    }
  };

  const updatePriority = (id: number, field: keyof PriorityItem, value: any) => {
    setPriorities(priorities.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const deletePriority = (id: number) => {
    setPriorities(priorities.filter(p => p.id !== id));
  };

  return {
    statuses,
    priorities,
    addStatus,
    updateStatus,
    deleteStatus,
    addPriority,
    updatePriority,
    deletePriority,
    setStatuses,
    setPriorities
  };
};