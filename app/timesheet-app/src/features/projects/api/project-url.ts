import { SERVICE_URL } from '@/shared/api/service-url'

// Project endpoints
export const PROJECT_URL = {
    projects: `${SERVICE_URL.timesheet}/Projects`,
    projectById: (id: string) => `${SERVICE_URL.timesheet}/Projects(${id})`,
} as const
