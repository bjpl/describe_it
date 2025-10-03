import { logger } from '@/lib/logger';

// Disabled due to missing web-vitals dependency
// TODO: Re-enable when web-vitals is properly installed
export const reportWebVitals = () => {
  logger.info('Web vitals monitoring disabled');
};

export default reportWebVitals;