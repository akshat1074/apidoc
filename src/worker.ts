import 'dotenv/config';
import { documentationQueue } from './config/queue';
import prisma from './config/database';
import { getAllCodeFiles, getFileContent, extractOwnerRepo } from './services/githubService';
import { analyzeCode } from './services/aiService';
import logger from './config/logger';

documentationQueue.process(async (job) => {
  logger.info('Processing job', { jobId: job.id });

  const { jobId, githubUrl } = job.data;

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    const { owner, repo } = extractOwnerRepo(githubUrl);
    logger.info('Fetching files from repository', { owner, repo });

    const codeFiles = await getAllCodeFiles(owner, repo, '', 0, 3);
    logger.info('Code files found', { count: codeFiles.length });

    const filesToAnalyze = codeFiles.slice(0, 10);
    const allDocs: any[] = [];

    for (const file of filesToAnalyze) {
      logger.info('Analyzing file', { path: file.path });

      if (!file.download_url) {
        logger.warn('Skipping file - no download URL', { path: file.path });
        continue;
      }

      const content = await getFileContent(file.download_url);

      if (content.length > 10000) {
        logger.warn('Skipping file - too large', { path: file.path, size: content.length });
        continue;
      }

      const docs = await analyzeCode(content, file.name);

      allDocs.push({
        file: file.path,
        documentation: docs,
      });
    }

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

    logger.info('Job completed', { jobId: job.id, filesAnalyzed: allDocs.length });

  } catch (error) {
    logger.error('Job failed', { jobId: job.id, error });

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'failed' },
    });

    throw error;
  }
});

logger.info('Worker started and listening for jobs');