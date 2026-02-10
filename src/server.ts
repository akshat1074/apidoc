import 'dotenv/config';
import express from "express";
import cors from "cors";
import prisma from './config/database';
import { documentationQueue } from './config/queue';

const app = express();

app.use(express.json());
app.use(cors());

app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validate URL
    const validation = /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(\.git)?$/.test(url);
    
    if (!validation) {
      return res.status(400).json({ message: "Invalid Github URL" });
    }
    
    // Create job in database
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
    
    res.json({ 
      message: "Analysis started", 
      jobId: job.id 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    res.json({ jobId: job.id, status: job.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/api/docs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { documentation: true },
    });
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    if (job.status !== 'completed') {
      return res.json({ 
        message: `Job is ${job.status}`,
        status: job.status 
      });
    }
    
    res.json({ 
      jobId: job.id, 
      docs: job.documentation?.content 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});