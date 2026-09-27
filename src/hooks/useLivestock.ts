// Re-export useInspectionSites for backward compatibility
import { useInspectionSites, InspectionSite } from './useInspectionSites';

export { useInspectionSites };
export type { InspectionSite };
export const useLivestock = useInspectionSites;
export default useInspectionSites;