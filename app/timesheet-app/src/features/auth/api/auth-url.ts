import { SERVICE_URL } from '@/shared/api/service-url'

// Auth / User endpoints
export const AUTH_URL = {
    userInfo: `${SERVICE_URL.timesheet}/userInfo()`,
    users: `${SERVICE_URL.timesheet}/Users`,
    userById: (id: string) => `${SERVICE_URL.timesheet}/Users(${id})`,
} as const
