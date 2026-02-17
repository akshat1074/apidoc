import 'dotenv/config';
import { documentationQueue } from './config/queue';
import prisma from './config/database';
import { getAllCodeFiles, getFileContent, extractOwnerRepo } from './services/githubService';
import { analyzeCode } from './services/aiService';

documentationQueue.process(async (job) => {
  console.log(`📋 Processing job ${job.id}`);
  
  const { jobId, githubUrl } = job.data;
  
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });
    
    // Extract owner/repo
    const { owner, repo } = extractOwnerRepo(githubUrl);
    console.log(`📂 Fetching files from ${owner}/${repo}...`);
    
    // Get all code files recursively (max 3 levels deep)
    const codeFiles = await getAllCodeFiles(owner, repo, '', 0, 3);
    
    console.log(`📄 Found ${codeFiles.length} code files to analyze`);
    
    // Limit to first 10 files for now
    const filesToAnalyze = codeFiles.slice(0, 10);
    const allDocs: any[] = [];
    
    for (const file of filesToAnalyze) {
      console.log(`🤖 Analyzing ${file.path}...`);
      
      // Get file content from download_url
      if (!file.download_url) {
        console.log(`⚠️  Skipping ${file.path} - no download URL`);
        continue;
      }
      
      const content = await getFileContent(file.download_url);
      
      // Skip very large files (>10KB for now)
      if (content.length > 10000) {
        console.log(`⚠️  Skipping ${file.path} - too large (${content.length} chars)`);
        continue;
      }
      
      // Generate documentation
      const docs = await analyzeCode(content, file.name);
      
      allDocs.push({
        file: file.path,
        documentation: docs,
      });
    }
    
    // Save documentation
    await prisma.documentation.create({
      data: {
        jobId,
        content: { 
          repository: `${owner}/${repo}`,
          filesAnalyzed: allDocs.length,
          files: allDocs 
        },
      },
    });
    
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'completed' },
    });
    
    console.log(`✅ Job ${job.id} completed - analyzed ${allDocs.length} files`);
    
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