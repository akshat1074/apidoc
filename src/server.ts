import 'dotenv/config';
import express,{Request,Response} from "express";
import cors from "cors";
import prisma from './config/database';
import { documentationQueue } from './config/queue';
import { AppError, errorHandler } from './utils/errorHandler';
import { asyncHandler } from './middleware/asyncHandler';
import { authenticate, optionalAuth } from './middleware/auth';
import { apiLimiter, analyzeLimiter } from './middleware/rateLimiter';


const app = express();

app.use(express.json());
app.use(cors());

app.use('/api',apiLimiter)

app.post('/api/analyze',analyzeLimiter, asyncHandler(async (req:Request, res:Response) => {
  const { url } = req.body;
  
  // Validation
  if (!url) {
    throw new AppError('URL is required', 400);
  }
  
  if (typeof url !== 'string') {
    throw new AppError('URL must be a string', 400);
  }
  
  const validation = /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(\.git)?$/.test(url);
  
  if (!validation) {
    throw new AppError('Invalid GitHub repository URL', 400);
  }
  
  // Create job
  const job = await prisma.job.create({
    data: {
      githubUrl: url,
      status: 'pending',
    },
  });
  
  // Add to queue
  await documentationQueue.add({
    jobId: job.id,
    githubUrl: url,
  });
  
  res.status(201).json({ 
    status: 'success',
    message: "Analysis started", 
    data: {
      jobId: job.id 
    }
  });
}));

app.get('/api/jobs/:jobId',optionalAuth, asyncHandler(async (req:Request, res:Response) => {
  const { jobId } = req.params;

  if(!jobId){
    throw new AppError('Job ID is required',400)
  }
  
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });
  
  if (!job) {
    throw new AppError('Job not found', 404);
  }
  
  res.json({ 
    status: 'success',
    data: {
      jobId: job.id, 
      status: job.status,
      githubUrl: job.githubUrl,
      createdAt: job.createdAt
    }
  });
}));

app.get('/api/docs/:jobId',optionalAuth, asyncHandler(async (req:Request, res:Response) => {
  const { jobId } = req.params;
  
  if(!jobId){
    throw new AppError('Job ID is required',400)  
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { documentation: true },
  });
  
  if (!job) {
    throw new AppError('Job not found', 404);
  }
  
  if (job.status === 'pending' || job.status === 'processing') {
    return res.json({ 
      status: 'pending',
      message: `Job is ${job.status}`,
      data: {
        jobStatus: job.status 
      }
    });
  }
  
  if (job.status === 'failed') {
    throw new AppError('Job processing failed. Please try again.', 500);
  }
  
  res.json({ 
    status: 'success',
    data: {
      jobId: job.id,
      documentation: job.documentation?.content 
    }
  });
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(error, res);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});