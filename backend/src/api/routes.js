import express from 'express';
import authRoutes from './auth/routes/auth.routes.js';
import questionRoutes from './question/routes/question.routes.js';
import answersRoutes from './answer/routes/answer.routes.js';

export const mainRouter = express.Router();

// Authentication routes
mainRouter.use('/auth', authRoutes);
// /api/questions
mainRouter.use("/questions", questionRoutes);
// /api/answers
mainRouter.use("/answers", answersRoutes);
