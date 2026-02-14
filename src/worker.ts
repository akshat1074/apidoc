import 'dotenv/config';
import { documentationQueue } from './config/queue';
import prisma from './config/database';
import { getRepositoryFiles, getFileContent } from './services/githubService';
import { analyzeCode } from './services/aiService';
import axios from 'axios';

documentationQueue.process(async (job) => {
  console.log(`📋 Processing job ${job.id}`);
  
  const { jobId, githubUrl } = job.data;
  
  try {
    // Update job status to processing
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });
    
    // Extract owner/repo from URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    
    const [, owner, repo] = match;
    
    // Get repository files
    console.log(`📂 Fetching files from ${owner}/${repo}...`);
    const files = await getRepositoryFiles(githubUrl);
    
    // Filter for code files (skip tests, configs, etc.)
    const codeFiles = files.filter(file => 
      file.type === 'file' && 
      (file.name.endsWith('.js') || 
       file.name.endsWith('.ts') || 
       file.name.endsWith('.jsx') ||
       file.name.endsWith('.tsx')) &&
      !file.name.includes('.test.') &&
      !file.name.includes('.spec.')
    );
    
    console.log(`📄 Found ${codeFiles.length} code files to analyze`);
    
    // Analyze first 5 files (for now, to avoid overwhelming the API)
    const filesToAnalyze = codeFiles.slice(0, 5);
    const allDocs: any[] = [];
    
    for (const file of filesToAnalyze) {
      console.log(`🤖 Analyzing ${file.path}...`);
      
      // Get file content
      const content = await getFileContent(owner, repo, file.path);
      
      // Generate documentation
      const docs = await analyzeCode(content, file.name);
      
      allDocs.push({
        file: file.path,
        documentation: docs,
      });
    }
    
    // Save documentation to database
    await prisma.documentation.create({
      data: {
        jobId,
        content: { files: allDocs },
      },
    });
    
    // Update job to completed
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'completed' },
    });
    
    console.log(`✅ Job ${job.id} completed - analyzed ${filesToAnalyze.length} files`);
    
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);
    
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'failed' },
    });
    
    throw error;
  }
});

console.log('🔧 Worker started and listening for jobs...');