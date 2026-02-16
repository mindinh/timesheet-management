import { useProjectStore } from '../store/projectStore'

export const useProjects = () => {
    return useProjectStore()
}
