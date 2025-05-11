import express from 'express';
import ClassroomRoutes from './routes/ClassroomRoutes';
import ProblemRoutes from './routes/ProblemRoutes';
import AssignmentRoutes from './routes/AssignmentRoutes';
import LanguageRoutes from './routes/LanguageRoutes';
import AuthRoutes from './routes/AuthRoutes';
import JudgeRoutes from './routes/JudgeRoutes';
import cors from 'cors';
import dotenv from 'dotenv';
import { AssignmentStatisticsService } from './services/statistics/AssignmentAnlaysis/AssignmentStatistics';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use('/api/classrooms', ClassroomRoutes);

app.use('/api/assignments', AssignmentRoutes);

app.use('/api/problems', ProblemRoutes);

app.use('/api/auth', AuthRoutes);

app.use('/api/language', LanguageRoutes);

app.use('/api/judge', JudgeRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}!`);
});

AssignmentStatisticsService.getInstance();