// server/src/routes/chat.ts
import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';

const router = Router();

// Send message (client or staff)
router.post('/send', chatController.sendMessage);

// Get all messages for an application
router.get('/application/:applicationId', chatController.getMessages);

export default router;
