import { Router } from 'express';
import { submitPersonalInfo } from '../controllers/formController.js';
import { getCsvRecord } from '../controllers/csvRecordController.js';
import { csvLookupRateLimit } from '../middleware/csvLookupRateLimit.js';

const router = Router();

// Endpoint for form submission
router.post('/personal-info', submitPersonalInfo);
router.get('/csv-records/:username', csvLookupRateLimit, getCsvRecord);

export default router;
