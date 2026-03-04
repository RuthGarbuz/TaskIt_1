import { useState } from 'react';
import type { ProjectSection } from '../Data/projectsData';

export const useProjects = (initialData: ProjectSection[]) => {
  const [sections, setSections] = useState<ProjectSection[]>(initialData);

  // Toggle functions
  const toggleSection = (sectionId: number) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, isExpanded: !section.isExpanded }
        : section
    ));
  };

  const toggleStage = (sectionId: number, stageId: number) => {
    setSections(sections.map(section => 
      section.id === sectionId
        ? {
            ...section,
            stages: section.stages.map(stage =>
              stage.id === stageId
                ? { ...stage, isExpanded: !stage.isExpanded }
                : stage
            )
          }
        : section
    ));
  };

  // Add functions
  const addSection = (name: string) => {
    if (name.trim()) {
      const newSection: ProjectSection = {
        id: Date.now(),
        name: name.trim(),
        stages: [],
        isExpanded: true
      };
      setSections([...sections, newSection]);
    }
  };

  const addStage = (sectionId: number, name: string) => {
    if (name.trim()) {
      setSections(sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              stages: [
                ...section.stages,
                {
                  id: Date.now(),
                  name: name.trim(),
                  subTasks: [],
                  isExpanded: true
                }
              ]
            }
          : section
      ));
    }
  };

  const addSubTask = (sectionId: number, stageId: number, name: string) => {
    if (name.trim()) {
      setSections(sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              stages: section.stages.map(stage =>
                stage.id === stageId
                  ? {
                      ...stage,
                      subTasks: [
                        ...stage.subTasks,
                        {
                          id: Date.now(),
                          name: name.trim(),
                          completed: false
                        }
                      ]
                    }
                  : stage
              )
            }
          : section
      ));
    }
  };

  // Delete functions
  const deleteSection = (sectionId: number) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const deleteStage = (sectionId: number, stageId: number) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            stages: section.stages.filter(stage => stage.id !== stageId)
          }
        : section
    ));
  };

  const deleteSubTask = (sectionId: number, stageId: number, subTaskId: number) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            stages: section.stages.map(stage =>
              stage.id === stageId
                ? {
                    ...stage,
                    subTasks: stage.subTasks.filter(subTask => subTask.id !== subTaskId)
                  }
                : stage
            )
          }
        : section
    ));
  };

  return {
    sections,
    toggleSection,
    toggleStage,
    addSection,
    addStage,
    addSubTask,
    deleteSection,
    deleteStage,
    deleteSubTask
  };
};