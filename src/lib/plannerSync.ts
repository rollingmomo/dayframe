import { supabase } from './supabase';

export type ScheduleByDate = Record<string, unknown[]>;
export type TasksByDate = Record<string, unknown[]>;

function toDateKeyLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function toDateKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadPlannerData(userId: string) {
  const { data, error } = await supabase
    .from('planner_data')
    .select('tasks, schedule, categories, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to load planner:', error);
    return null;
  }

  if (!data) return null;

  // Legacy migration: use updated_at (local date) so Saturday's data stays on Saturday
  const legacyDateKey = data.updated_at
    ? toDateKeyFromDate(new Date(data.updated_at))
    : toDateKeyLocal();

  // tasks: legacy array → { [savedDate]: array }, or object { [date]: tasks }
  let tasksByDate: TasksByDate = {};
  if (data.tasks != null) {
    if (Array.isArray(data.tasks)) {
      if (data.tasks.length > 0) tasksByDate[legacyDateKey] = data.tasks;
    } else if (typeof data.tasks === 'object' && !Array.isArray(data.tasks)) {
      tasksByDate = data.tasks as TasksByDate;
    }
  }

  // schedule: legacy array → { [savedDate]: array }, or object { [date]: slots }
  let schedules: ScheduleByDate = {};
  if (data.schedule != null) {
    if (Array.isArray(data.schedule)) {
      if (data.schedule.length > 0) schedules[legacyDateKey] = data.schedule;
    } else if (typeof data.schedule === 'object' && !Array.isArray(data.schedule)) {
      schedules = data.schedule as ScheduleByDate;
    }
  }

  return {
    tasksByDate,
    schedules,
    categories: Array.isArray(data.categories) && data.categories.length > 0 ? data.categories : null,
  };
}

export async function savePlannerData(
  userId: string,
  tasksByDate: TasksByDate,
  schedules: ScheduleByDate,
  categories: unknown[]
) {
  const { error } = await supabase.from('planner_data').upsert(
    {
      user_id: userId,
      tasks: tasksByDate,
      schedule: schedules,
      categories,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Failed to save planner:', error);
    return false;
  }
  return true;
}
