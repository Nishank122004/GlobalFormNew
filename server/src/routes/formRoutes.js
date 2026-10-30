import { Router } from 'express';
import { submitPersonalInfo } from '../controllers/formController.js';

const router = Router();

// Endpoint for form submission
router.post('/personal-info', submitPersonalInfo);

export default router;
