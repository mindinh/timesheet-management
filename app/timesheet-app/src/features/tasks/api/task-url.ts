import { SERVICE_URL } from '@/shared/api/service-url'

// Task endpoints
export const TASK_URL = {
    tasks: `${SERVICE_URL.timesheet}/Tasks`,
    taskById: (id: string) => `${SERVICE_URL.timesheet}/Tasks(${id})`,
} as const
