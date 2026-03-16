/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Star, Clock, ListTodo, Calendar, X, MoreVertical, Settings, User, Check, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { loadPlannerData, savePlannerData } from './lib/plannerSync';
import logoImg from './assets/logo.svg';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Category = string;

interface CategoryConfig {
  id: string;
  label: string;
  color: string;
  bg?: string;
  border?: string;
  text?: string;
  dot?: string;
  isCustom?: boolean;
}

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'personal', label: 'Personal', color: '#0ea5e9', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', dot: 'bg-sky-500' },
  { id: 'work', label: 'Work', color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', dot: 'bg-indigo-500' },
  { id: 'study', label: 'Study', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-500' },
];

interface Task {
  id: string;
  text: string;
  completed: boolean;
  isTop3: boolean;
  category: string;
  priorityIndex?: number;
}

interface TimeSlot {
  time: string;
  taskId: string | null;
  customText: string;
  category?: string;
  done?: boolean;
}

const GENERATE_TIME_SLOTS = () => {
  const slots: TimeSlot[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    const displayHour = hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    slots.push({ time: `${displayHour}:00 ${ampm}`, taskId: null, customText: '' });
    slots.push({ time: `${displayHour}:30 ${ampm}`, taskId: null, customText: '' });
  }
  return slots;
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const COLOR_PALETTE = [
  '#0ea5e9', // Sky
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#C45C3C', // Coral
  '#8B6E3A', // Warm Taupe
  '#B8436D', // Rose
];

const TAILWIND_BY_COLOR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  '#0ea5e9': { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', dot: 'bg-sky-500' },
  '#6366f1': { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', dot: 'bg-indigo-500' },
  '#10b981': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-500' },
};

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('personal');
  const [schedules, setSchedules] = useState<Record<string, TimeSlot[]>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [activePriorityIndex, setActivePriorityIndex] = useState<number | null>(null);
  const [activeCategoryMenuId, setActiveCategoryMenuId] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');
  const [categoryFormColor, setCategoryFormColor] = useState(COLOR_PALETTE[0]);
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [eventModalSlotIndex, setEventModalSlotIndex] = useState<number | null>(null);
  const [eventModalText, setEventModalText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const selectedDateKey = toDateKey(selectedDate);
  const tasks = useMemo(
    () => tasksByDate[selectedDateKey] ?? [],
    [tasksByDate, selectedDateKey]
  );
  const schedule = useMemo(
    () => schedules[selectedDateKey] ?? GENERATE_TIME_SLOTS(),
    [schedules, selectedDateKey]
  );



  const updateTasks = (updater: (prev: Task[]) => Task[]) => {
    setTasksByDate(prev => {
      const current = prev[selectedDateKey] ?? [];
      return { ...prev, [selectedDateKey]: updater(current) };
    });
  };

  const updateSchedule = (updater: (prev: TimeSlot[]) => TimeSlot[]) => {
    setSchedules(prev => {
      const current = prev[selectedDateKey] ?? GENERATE_TIME_SLOTS();
      return { ...prev, [selectedDateKey]: updater(current) };
    });
  };

  const dataLoadedRef = React.useRef(false);

  // Load from Supabase when logged in
  useEffect(() => {
    if (authLoading || !user) return;
    dataLoadedRef.current = false;
    setSaveError(null);
    loadPlannerData(user.id).then((data) => {
      if (data) {
        setTasksByDate(data.tasksByDate as Record<string, Task[]>);
        setSchedules(data.schedules as Record<string, TimeSlot[]>);
        if (data.categories) setCategories(data.categories);
      } else {
        setTasksByDate({});
        setSchedules({});
      }
      dataLoadedRef.current = true;
    }).catch((err) => {
      console.error('[Dayframe] Load error:', err);
      setSaveError('데이터 로드 실패: ' + (err?.message || String(err)));
      dataLoadedRef.current = true;
    });
  }, [user?.id, authLoading]);

  // Save immediately when data changes
  const prevDataRef = React.useRef<string>('');
  useEffect(() => {
    if (authLoading || !user || !dataLoadedRef.current) return;
    const snapshot = JSON.stringify({ t: tasksByDate, s: schedules, c: categories });
    if (snapshot === prevDataRef.current) return;
    prevDataRef.current = snapshot;
    savePlannerData(user.id, tasksByDate, schedules, categories).then((ok) => {
      if (!ok) setSaveError('저장 실패 — Supabase 테이블이 생성되었는지 확인하세요');
      else setSaveError(null);
    });
  }, [user?.id, tasksByDate, schedules, categories, authLoading]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveCategoryMenuId(null);
      setShowDatePicker(false);
      setProfileMenuOpen(false);
    };
    if (activeCategoryMenuId || showDatePicker || profileMenuOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeCategoryMenuId, showDatePicker, profileMenuOpen]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      completed: false,
      isTop3: false,
      category: newTaskCategory,
    };
    updateTasks(prev => [...prev, newTask]);
    setNewTaskText('');
  };

  const deleteTask = (id: string) => {
    updateTasks(prev => prev.filter(t => t.id !== id));
    updateSchedule(prev => prev.map(slot => slot.taskId === id ? { ...slot, taskId: null } : slot));
  };

  const toggleTop3 = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    if (!task.isTop3) {
      const currentTop3 = tasks.filter(t => t.isTop3);
      if (currentTop3.length >= 3) {
        alert('You can only have 3 top priorities!');
        return;
      }
      // Find first available priority index
      const occupied = currentTop3.map(t => t.priorityIndex).filter(idx => idx !== undefined) as number[];
      let firstAvailable = 0;
      while (occupied.includes(firstAvailable)) firstAvailable++;
      
      updateTasks(prev => prev.map(t => t.id === id ? { ...t, isTop3: true, priorityIndex: firstAvailable } : t));
    } else {
      updateTasks(prev => prev.map(t => t.id === id ? { ...t, isTop3: false, priorityIndex: undefined } : t));
    }
  };

  const assignTaskToPriority = (priorityIndex: number, taskId: string | null) => {
    updateTasks(prev => prev.map(t => {
      if (t.priorityIndex === priorityIndex) return { ...t, isTop3: false, priorityIndex: undefined };
      if (t.id === taskId) return { ...t, isTop3: true, priorityIndex };
      return t;
    }));
    setActivePriorityIndex(null);
  };

  const closeCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategoryId(null);
    setCategoryFormName('');
    setCategoryFormColor(COLOR_PALETTE[0]);
  };

  const openAddCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryFormName('');
    setCategoryFormColor(COLOR_PALETTE[0]);
    setShowCategoryForm(true);
  };

  const openEditCategoryForm = (cat: CategoryConfig) => {
    setEditingCategoryId(cat.id);
    setCategoryFormName(cat.label);
    setCategoryFormColor(cat.color);
    setShowCategoryForm(true);
  };

  const submitCategoryForm = () => {
    const name = categoryFormName.trim();
    if (!name) return;

    const tw = TAILWIND_BY_COLOR[categoryFormColor];
    const base = { label: name, color: categoryFormColor, isCustom: true };
    const withStyle = tw ? { ...base, bg: tw.bg, border: tw.border, text: tw.text, dot: tw.dot } : { ...base, bg: undefined, border: undefined, text: undefined, dot: undefined };

    if (editingCategoryId) {
      setCategories(categories.map(c =>
        c.id === editingCategoryId ? { ...c, ...withStyle } : c
      ));
    } else {
      const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      setCategories([...categories, { ...withStyle, id }]);
      setNewTaskCategory(id);
    }
    closeCategoryForm();
  };

  const deleteCategory = (catId: string) => {
    setCategories(categories.filter(c => c.id !== catId));
    setTasksByDate(prev => {
      const next: Record<string, Task[]> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k] = v.map(t => t.category === catId ? { ...t, category: 'personal' } : t);
      }
      return next;
    });
    if (newTaskCategory === catId) setNewTaskCategory('personal');
    closeCategoryForm();
  };

  const updateTaskText = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    updateTasks(prev => prev.map(t => t.id === id ? { ...t, text: trimmed } : t));
    setEditingTaskId(null);
  };

  const updateTaskCategory = (id: string, category: Category) => {
    updateTasks(prev => prev.map(t => t.id === id ? { ...t, category } : t));
  };

  const top3Tasks = useMemo(() => {
    const slots: (Task | undefined)[] = [undefined, undefined, undefined];
    tasks.forEach(t => {
      if (t.isTop3 && t.priorityIndex !== undefined && t.priorityIndex >= 0 && t.priorityIndex < 3) {
        slots[t.priorityIndex] = t;
      }
    });
    return slots;
  }, [tasks]);

  const isTaskAllDone = (taskId: string) => {
    const slots = schedule.filter(s => s.taskId === taskId);
    return slots.length > 0 && slots.every(s => s.done);
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aDone = schedule.filter(s => s.taskId === a.id).length > 0 && schedule.filter(s => s.taskId === a.id).every(s => s.done);
      const bDone = schedule.filter(s => s.taskId === b.id).length > 0 && schedule.filter(s => s.taskId === b.id).every(s => s.done);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      if (a.isTop3 && !b.isTop3) return -1;
      if (!a.isTop3 && b.isTop3) return 1;
      if (a.isTop3 && b.isTop3) {
        return (a.priorityIndex ?? 0) - (b.priorityIndex ?? 0);
      }
      return 0;
    });
  }, [tasks, schedule]);

  const assignTaskToSlot = (slotIndex: number, taskId: string | null, customText: string = '', category?: string) => {
    updateSchedule(prev => {
      const newSchedule = [...prev];
      newSchedule[slotIndex] = { ...newSchedule[slotIndex], taskId, customText, category: category || newSchedule[slotIndex].category };
      return newSchedule;
    });
    setActiveSlotIndex(null);
  };

  const updateSlotCategory = (slotIndex: number, category: string) => {
    const slot = schedule[slotIndex];
    if (slot.taskId) {
      updateTaskCategory(slot.taskId, category);
    } else {
      updateSchedule(prev => {
        const newSchedule = [...prev];
        newSchedule[slotIndex] = { ...newSchedule[slotIndex], category };
        return newSchedule;
      });
    }
  };

  // Split schedule into 3 parts for the grid
  const morning = schedule.slice(0, 12);    // 6:00 AM - 11:30 AM
  const afternoon = schedule.slice(12, 24); // 12:00 PM - 5:30 PM
  const evening = schedule.slice(24);       // 6:00 PM - 12:00 AM

    const now = new Date();
    const currentSlotIndex = (() => {
      const h = now.getHours();
      const m = now.getMinutes();
      if (h < 6) return -1;
      if (h === 0 && m >= 0) return 37;
      return (h - 6) * 2 + (m >= 30 ? 1 : 0);
    })();

    const renderTimeSlot = (slot: TimeSlot, globalIndex: number) => {
    const assignedTask = tasks.find(t => t.id === slot.taskId);
    const isActive = activeSlotIndex === globalIndex;
    const isNow = globalIndex === currentSlotIndex && isToday;
    
    const taskCat = categories.find(c => c.id === assignedTask?.category);
    const slotCat = categories.find(c => c.id === slot.category);
    const activeCat = (assignedTask ? taskCat : slotCat) || slotCat || categories[0] || DEFAULT_CATEGORIES[0];
    const hasFill = !!(assignedTask || slot.customText);
    const isDragging = draggedSlotIndex === globalIndex;
    const isDragOver = dragOverSlotIndex === globalIndex && draggedSlotIndex !== globalIndex;

    return (
      <div key={globalIndex} className="group/slot flex gap-4 relative">
        {/* Time Column */}
        <div className="w-14 shrink-0 flex flex-col items-end pt-2">
          <span className={cn("text-[10px] font-mono uppercase leading-none", isNow ? "font-extrabold text-zinc-900" : "font-bold text-zinc-400")}>
            {slot.time.split(' ')[0]}
          </span>
          <span className={cn("text-[8px] font-mono uppercase leading-none mt-0.5", isNow ? "font-bold text-zinc-700" : "font-medium text-zinc-300")}>
            {slot.time.split(' ')[1]}
          </span>
        </div>

        {/* Timeline Line & Dot */}
        <div className="relative flex flex-col items-center">
          <div className={cn("w-px h-full absolute top-0", isNow ? "w-0.5 bg-zinc-900 rounded-full" : "bg-zinc-100")} />
        </div>
        
        {/* Task Block */}
        <div className="flex-1 min-w-0 pb-3">
          <div 
            onClick={() => {
              if (slot.done) {
                updateSchedule(prev => {
                  const newSchedule = [...prev];
                  newSchedule[globalIndex] = { ...newSchedule[globalIndex], done: false };
                  return newSchedule;
                });
              } else {
                setActiveSlotIndex(isActive ? null : globalIndex);
              }
            }}
            draggable={hasFill}
            onDragStart={(e) => {
              if (!hasFill) return;
              setDraggedSlotIndex(globalIndex);
              e.dataTransfer.effectAllowed = 'copyMove';
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.opacity = '0.5';
              }
            }}
            onDragEnd={(e) => {
              setDraggedSlotIndex(null);
              setDragOverSlotIndex(null);
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
              setDragOverSlotIndex(globalIndex);
            }}
            onDragLeave={() => {
              if (dragOverSlotIndex === globalIndex) setDragOverSlotIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const isCopy = e.altKey;
              if (draggedSlotIndex !== null && draggedSlotIndex !== globalIndex) {
                updateSchedule(prev => {
                  const newSchedule = [...prev];
                  const from = { ...newSchedule[draggedSlotIndex] };
                  newSchedule[globalIndex] = { ...newSchedule[globalIndex], taskId: from.taskId, customText: from.customText, category: from.category };
                  if (!isCopy) {
                    newSchedule[draggedSlotIndex] = { ...newSchedule[draggedSlotIndex], taskId: null, customText: '', category: undefined };
                  }
                  return newSchedule;
                });
              }
              setDraggedSlotIndex(null);
              setDragOverSlotIndex(null);
            }}
            className={cn(
              "group min-h-[44px] rounded-xl transition-all cursor-pointer border flex items-center px-4 overflow-hidden",
              isDragging && "opacity-50",
              isDragOver && "ring-2 ring-zinc-900/20 scale-[1.02]",
              slot.done
                ? "bg-zinc-100 border-zinc-200 text-zinc-400"
                : hasFill
                  ? activeCat.bg
                    ? `${activeCat.bg} ${activeCat.border} ${activeCat.text} shadow-sm scale-[1.01]`
                    : "shadow-sm scale-[1.01]"
                  : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50 border-dashed"
            )}
            style={!slot.done && hasFill && !activeCat.bg
              ? { backgroundColor: activeCat.color + '15', borderColor: activeCat.color + '40', color: activeCat.color }
              : undefined
            }
          >
            <div className={cn("flex-1 flex items-center gap-3 overflow-hidden min-w-0", slot.done && "opacity-50")}>
              {editingSlotIndex === globalIndex ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => {
                    const trimmed = editText.trim();
                    if (assignedTask && trimmed) {
                      updateTasks(prev => prev.map(t => t.id === assignedTask!.id ? { ...t, text: trimmed } : t));
                    } else if (!assignedTask && trimmed) {
                      updateSchedule(prev => {
                        const newSchedule = [...prev];
                        newSchedule[globalIndex] = { ...newSchedule[globalIndex], customText: trimmed };
                        return newSchedule;
                      });
                    } else if (!assignedTask && !trimmed) {
                      updateSchedule(prev => {
                        const newSchedule = [...prev];
                        newSchedule[globalIndex] = { ...newSchedule[globalIndex], customText: '', taskId: null, category: undefined };
                        return newSchedule;
                      });
                    }
                    setEditingSlotIndex(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      setEditText(assignedTask?.text || slot.customText || '');
                      setEditingSlotIndex(null);
                      e.currentTarget.blur();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 text-xs font-bold bg-transparent border-none outline-none focus:ring-0 p-0"
                />
              ) : assignedTask ? (
                <>
                  {assignedTask.isTop3 ? (
                    <Star className={cn("w-3.5 h-3.5 shrink-0", slot.done ? "fill-zinc-300 text-zinc-300" : "fill-zinc-800 text-zinc-800")} />
                  ) : null}
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (slot.done) return;
                      setActiveSlotIndex(null);
                      setEditingSlotIndex(globalIndex);
                      setEditText(assignedTask?.text || '');
                    }}
                    className={cn("text-xs font-bold tracking-tight truncate cursor-text", slot.done && "line-through")}
                  >
                    {assignedTask?.text}
                  </span>
                </>
              ) : slot.customText ? (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (slot.done) return;
                    setActiveSlotIndex(null);
                    setEditingSlotIndex(globalIndex);
                    setEditText(slot.customText);
                  }}
                  className={cn("text-xs font-bold tracking-tight truncate cursor-text", slot.done && "line-through")}
                >
                  {slot.customText}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">Click to schedule...</span>
              )}
            </div>
            {hasFill && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateSchedule(prev => {
                      const newSchedule = [...prev];
                      newSchedule[globalIndex] = { ...newSchedule[globalIndex], done: !slot.done };
                      return newSchedule;
                    });
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    slot.done
                      ? "hidden"
                      : "opacity-0 group-hover:opacity-100 hover:bg-black/5 text-current/40 hover:text-blue-500"
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  updateSchedule(prev => {
                    const newSchedule = [...prev];
                    newSchedule[globalIndex] = { ...newSchedule[globalIndex], taskId: null, customText: '', category: undefined, done: false };
                    return newSchedule;
                  });
                }}
                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/5 rounded-lg transition-all text-current/40 hover:text-zinc-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="absolute left-20 right-4 top-12 z-50 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-3 max-h-72 overflow-y-auto custom-scrollbar"
              >
                <div className="space-y-3">
                  {/* Category Selection */}
                  <div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">Set Category</p>
                    <div className={cn("flex items-center gap-1.5 flex-wrap", categories.length > 4 && "max-h-16 overflow-y-auto custom-scrollbar")}>
                      {categories.map(c => (
                        <button
                          key={c.id}
                          onClick={() => updateSlotCategory(globalIndex, c.id)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all border",
                            activeCat.id === c.id 
                              ? c.bg
                                ? `${c.bg} ${c.border} ${c.text}`
                                : "ring-1 ring-black/10 shadow-sm"
                              : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                          )}
                          style={activeCat.id === c.id && !c.bg ? { backgroundColor: c.color + '15', borderColor: c.color + '40', color: c.color } : undefined}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100" />

                  {/* Task Selection */}
                  <div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-1">Assign Task</p>
                    <div className="space-y-1">
                      {top3Tasks.filter((t): t is Task => !!t).map(task => (
                        <button
                          key={task.id}
                          onClick={() => assignTaskToSlot(globalIndex, task.id)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-900 hover:text-white transition-all flex items-center gap-3 group/item"
                        >
                          <Star className="w-3.5 h-3.5 fill-zinc-800 text-zinc-800" />
                          <span className="text-[11px] font-bold truncate">{task.text}</span>
                        </button>
                      ))}
                      {top3Tasks.filter(t => !!t).length > 0 && <div className="h-px bg-zinc-100 my-1.5 mx-2" />}
                      {tasks.filter(t => t && !t.isTop3).map(task => {
                        return (
                          <button
                            key={task.id}
                            onClick={() => assignTaskToSlot(globalIndex, task.id)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 transition-all flex items-center gap-3"
                          >
                            <span className="text-[11px] font-medium text-zinc-700 truncate">{task.text}</span>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          setEventModalSlotIndex(globalIndex);
                          setEventModalText('');
                          setActiveSlotIndex(null);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 transition-all text-[10px] text-zinc-400 italic font-medium"
                      >
                        + Add Event
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const selectedMonth = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();
  const selectedYear = selectedDate.getFullYear();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const weekdayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const monthDayYear = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const isToday = today.toDateString() === selectedDate.toDateString();

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-sm text-zinc-500">Loading...</div>
      </div>
    );
  }
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {saveError && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-500 text-white text-xs font-bold text-center py-2 px-4">
          ⚠ {saveError}
        </div>
      )}
      <div className="px-4 pt-3 pb-4 lg:px-8 lg:pt-4 lg:pb-8">

      {/* Logo Bar */}
      <div className="max-w-[1600px] mx-auto mb-4 py-1.5 pb-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex-1 flex justify-start">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                showDatePicker
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              Today
            </button>
            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-2xl shadow-xl p-4 w-[280px]"
                >
                  <button
                    onClick={() => { setSelectedDate(new Date()); setShowDatePicker(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors mb-3 flex items-center gap-2"
                  >
                    <span className="text-sm">↩</span> Go to Today
                  </button>
                  <div className="border-t border-zinc-100 pt-3">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth - 1, 1))}
                        className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-zinc-900">
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth + 1, 1))}
                        className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="text-center text-[9px] font-bold text-zinc-400 py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {(() => {
                        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();
                        const days = [];
                        for (let i = 0; i < firstDayOfMonth; i++) {
                          days.push(<div key={`empty-${i}`} />);
                        }
                        for (let d = 1; d <= daysInMonth; d++) {
                          const isSelected = d === selectedDay;
                          const isTodayDate = today.getDate() === d && today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
                          days.push(
                            <button
                              key={d}
                              onClick={() => { setSelectedDate(new Date(selectedYear, selectedMonth, d)); setShowDatePicker(false); }}
                              className={cn(
                                "aspect-square rounded-full text-[10px] font-semibold transition-all flex items-center justify-center",
                                isSelected
                                  ? "bg-zinc-900 text-white"
                                  : isTodayDate
                                    ? "border border-zinc-400 text-zinc-700"
                                    : "text-zinc-500 hover:bg-zinc-100"
                              )}
                            >
                              {d}
                            </button>
                          );
                        }
                        return days;
                      })()}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex-shrink-0">
          <img src={logoImg} alt="Dayframe" className="h-12" />
        </div>
        <div className="flex-1 flex justify-end relative">
          <button
            onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(!profileMenuOpen); }}
            className="p-2 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
          >
            <User className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 min-w-[140px]"
              >
                <p className="px-3 py-1.5 text-[10px] text-zinc-400 truncate max-w-[140px]">{user?.email}</p>
                <button
                  onClick={async () => {
                    if (user && dataLoadedRef.current) {
                      await savePlannerData(user.id, tasksByDate, schedules, categories);
                    }
                    signOut();
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <header className="max-w-[1600px] mx-auto mb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth, selectedDay - 1))}
                className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-300 hover:text-zinc-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{weekdayName}</h1>
                <p className="text-xs font-medium text-zinc-400 tracking-wide mt-0.5">{monthDayYear}</p>
              </div>
              <button
                onClick={() => setSelectedDate(new Date(selectedYear, selectedMonth, selectedDay + 1))}
                className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-300 hover:text-zinc-500"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#e4e4e7" strokeWidth="3" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke="#18181b" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - (() => { const filled = schedule.filter(s => s.taskId || s.customText); return filled.length > 0 ? filled.filter(s => s.done).length / filled.length : 0; })())}`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-900">
                {(() => { const filled = schedule.filter(s => s.taskId || s.customText); return filled.length > 0 ? Math.round((filled.filter(s => s.done).length / filled.length) * 100) : 0; })()}%
              </span>
            </div>
          </div>
        </div>

        {/* Top 3 Priorities - Horizontal in Header, aligned with Timetable width */}
        <div className="lg:col-span-9 flex flex-col md:flex-row gap-4">
          {[0, 1, 2].map((index) => {
            const task = top3Tasks[index];
            const isActive = activePriorityIndex === index;
            
            return (
              <div key={index} className="relative flex-1">
                <div 
                  onClick={() => setActivePriorityIndex(isActive ? null : index)}
                  className={cn(
                    "relative h-16 rounded-xl border transition-all cursor-pointer flex items-center px-4",
                    task 
                      ? "bg-white border-zinc-100 text-zinc-900 shadow-sm hover:border-zinc-200" 
                      : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200 border-dashed hover:bg-zinc-50/50"
                  )}
                >
                  {/* Priority tag removed */}
                  <div className="flex-1 flex items-center gap-3 overflow-hidden">
                    {task ? (
                      <>
                        <Star className="w-3.5 h-3.5 fill-zinc-800 text-zinc-800 shrink-0" />
                        <p className="text-xs font-bold truncate">{task.text}</p>
                      </>
                    ) : (
                      <p className="text-xs font-medium">Select Priority {index + 1}</p>
                    )}
                  </div>
                  {task && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleTop3(task.id); }}
                      className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-2 max-h-56 overflow-y-auto custom-scrollbar"
                    >
                      <div className="space-y-1">
                        {sortedTasks.filter(t => t && t.id !== task?.id).length === 0 && (
                          <p className="text-[10px] text-zinc-400 italic p-4 text-center">No other tasks available</p>
                        )}
                        {sortedTasks.filter(t => t && t.id !== task?.id).map(t => {
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                assignTaskToPriority(index, t.id);
                              }}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 transition-all flex items-center gap-3"
                            >
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-[11px] font-medium text-zinc-700 truncate">{t?.text}</span>
                                {t.isTop3 && (
                                  <span className="text-[8px] font-bold text-zinc-400 uppercase">P{t.priorityIndex! + 1}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Brain Dump (Long) */}
        <section className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2 mb-4">
                <ListTodo className="w-4 h-4 text-zinc-600" />
                <h2 className="text-sm font-bold text-zinc-900">Brain Dump</h2>
              </div>
              <form onSubmit={addTask} className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add to list..."
                    className="w-full text-xs pl-3 pr-10 py-2.5 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                  />
                  <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 relative">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewTaskCategory(cat.id)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        openEditCategoryForm(cat);
                      }}
                      className={cn(
                        "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all border",
                        editingCategoryId === cat.id && "ring-2 ring-zinc-900/20",
                        newTaskCategory === cat.id
                          ? cat.bg
                            ? `${cat.bg} ${cat.border} ${cat.text}`
                            : "ring-1 ring-black/10 shadow-sm"
                          : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                      )}
                      style={newTaskCategory === cat.id && !cat.bg ? { backgroundColor: cat.color + '15', borderColor: cat.color + '40', color: cat.color } : undefined}
                    >
                      {cat.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => showCategoryForm && !editingCategoryId ? closeCategoryForm() : openAddCategoryForm()}
                    className={cn(
                      "px-1.5 py-1 rounded-md text-[9px] font-bold transition-all border",
                      showCategoryForm && !editingCategoryId
                        ? "bg-zinc-900 border-zinc-900 text-white"
                        : "bg-white border-dashed border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-500"
                    )}
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  <AnimatePresence>
                    {showCategoryForm && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            {editingCategoryId ? 'Edit Tag' : 'New Tag'}
                          </p>
                          {editingCategoryId && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete "${categoryFormName}" tag?`)) deleteCategory(editingCategoryId);
                              }}
                              className="text-[9px] font-bold uppercase text-red-400 hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={categoryFormName}
                          onChange={(e) => setCategoryFormName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCategoryForm(); } }}
                          placeholder="Tag name"
                          autoFocus
                          className="w-full text-xs px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PALETTE.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setCategoryFormColor(color)}
                              className={cn(
                                "w-5 h-5 rounded-full transition-all",
                                categoryFormColor === color ? "ring-2 ring-offset-1 ring-zinc-900 scale-110" : "hover:scale-110"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={submitCategoryForm}
                            disabled={!categoryFormName.trim()}
                            className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {editingCategoryId ? 'Save' : 'Add'}
                          </button>
                          <button
                            type="button"
                            onClick={closeCategoryForm}
                            className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {sortedTasks.filter(t => t && t.text).map((task) => {
                  const cat = categories.find(c => c.id === task.category) || categories[0];
                  const taskDone = isTaskAllDone(task.id);

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "group relative flex flex-col p-2 rounded-lg border transition-all",
                        taskDone
                          ? "bg-zinc-50 border-zinc-100"
                          : "bg-white border-zinc-100 hover:border-zinc-200",
                        task.isTop3 && !taskDone && "ring-1 ring-zinc-900/5 shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleTop3(task.id)} 
                          className={cn("p-1 shrink-0 transition-colors", taskDone ? "text-zinc-200" : task.isTop3 ? "text-zinc-900" : "text-zinc-200 hover:text-zinc-400")}
                        >
                          <Star className={cn("w-3.5 h-3.5", taskDone ? "text-zinc-300" : task.isTop3 ? "fill-zinc-800 text-zinc-800" : "text-zinc-300")} />
                        </button>
                        
                        <div className="flex-1 flex items-center gap-2 overflow-hidden min-w-0">
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", taskDone && "opacity-40")} style={{ backgroundColor: cat.color }} />
                          {editingTaskId === task.id ? (
                            <input
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onBlur={() => {
                                if (editText.trim()) updateTaskText(task.id, editText);
                                setEditingTaskId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                                if (e.key === 'Escape') {
                                  setEditText(task.text);
                                  setEditingTaskId(null);
                                  e.currentTarget.blur();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 min-w-0 text-xs font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
                            />
                          ) : (
                            <span
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (taskDone) return;
                                setActiveCategoryMenuId(null);
                                setEditingTaskId(task.id);
                                setEditText(task.text);
                              }}
                              className={cn("text-xs truncate cursor-text", taskDone ? "line-through text-zinc-400" : task.isTop3 ? "text-zinc-900 font-bold" : "text-zinc-600 font-medium")}
                            >
                              {task.text}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCategoryMenuId(activeCategoryMenuId === task.id ? null : task.id);
                              }}
                              className={cn(
                                "p-1 rounded hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600",
                                activeCategoryMenuId === task.id && "bg-zinc-100 text-zinc-600"
                              )}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            
                            <AnimatePresence>
                              {activeCategoryMenuId === task.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                  className="absolute right-0 top-full mt-1 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl p-1.5 min-w-[120px]"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingTaskId(task.id);
                                      setEditText(task.text);
                                      setActiveCategoryMenuId(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2"
                                  >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                    Edit
                                  </button>
                                  <div className="border-t border-zinc-100 my-1" />
                                  <p className="text-[8px] font-bold text-zinc-400 uppercase px-2 py-1 mb-1">Category</p>
                                  {categories.map(c => (
                                    <button
                                      key={c.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateTaskCategory(task.id, c.id);
                                        setActiveCategoryMenuId(null);
                                      }}
                                      className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-2",
                                        task.category === c.id ? "bg-zinc-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                                      {c.label}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          
                          <button 
                            onClick={() => deleteTask(task.id)} 
                            className="p-1 rounded hover:bg-red-50 transition-colors text-zinc-400 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Right Column: 2-Column Timetable */}
        <section className="lg:col-span-9">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-visible h-full">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-600" />
                <h2 className="text-sm font-bold text-zinc-900">Daily Timeline</h2>
              </div>
              <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-tighter flex-wrap justify-end">
                {/* Category legend removed */}
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
              {/* Morning */}
              <div className="space-y-0 relative">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-3">
                  Morning
                </h3>
                <div className="space-y-0">
                  {morning.map((slot, i) => renderTimeSlot(slot, i))}
                </div>
              </div>

              {/* Afternoon */}
              <div className="space-y-0 relative">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-3">
                  Afternoon
                </h3>
                <div className="space-y-0">
                  {afternoon.map((slot, i) => renderTimeSlot(slot, i + 12))}
                </div>
              </div>

              {/* Evening */}
              <div className="space-y-0 relative">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-3">
                  Evening
                </h3>
                <div className="space-y-0">
                  {evening.map((slot, i) => renderTimeSlot(slot, i + 24))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Add Event Modal */}
      <AnimatePresence>
        {eventModalSlotIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setEventModalSlotIndex(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-6 w-full max-w-sm mx-4"
            >
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Add Event</h3>
              <input
                type="text"
                value={eventModalText}
                onChange={(e) => setEventModalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (eventModalText.trim() && eventModalSlotIndex !== null) {
                      const id = crypto.randomUUID();
                      const slotCat = schedule[eventModalSlotIndex]?.category || newTaskCategory;
                      const newTask: Task = { id, text: eventModalText.trim(), completed: false, isTop3: false, category: slotCat };
                      updateTasks(prev => [...prev, newTask]);
                      assignTaskToSlot(eventModalSlotIndex, id);
                      setEventModalSlotIndex(null);
                    }
                  }
                }}
                placeholder="Enter event name"
                autoFocus
                className="w-full text-sm px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEventModalSlotIndex(null)}
                  className="flex-1 text-xs font-bold uppercase py-2.5 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (eventModalText.trim()) {
                      const id = crypto.randomUUID();
                      const slotCat = schedule[eventModalSlotIndex!]?.category || newTaskCategory;
                      const newTask: Task = { id, text: eventModalText.trim(), completed: false, isTop3: false, category: slotCat };
                      updateTasks(prev => [...prev, newTask]);
                      assignTaskToSlot(eventModalSlotIndex!, id);
                      setEventModalSlotIndex(null);
                    }
                  }}
                  disabled={!eventModalText.trim()}
                  className="flex-1 text-xs font-bold uppercase py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-[1600px] mx-auto mt-8 pb-8 text-center text-zinc-400 text-[10px] uppercase tracking-widest">
        © {new Date().getFullYear()} Dayframe • Stay Focused, Stay Productive.
      </footer>
      </div>
    </div>
  );
}
