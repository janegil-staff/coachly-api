import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { deleteAccount } from '../controllers/userController.js';

const router = express.Router();

router.delete('/me', authenticateUser, deleteAccount);

export default router;