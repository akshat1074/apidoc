import axios from 'axios';

interface GitHubFile {
  name: string;
  path: string;
  content?: string;
  type: 'file' | 'dir';
  download_url?: string;
}

export async function getAllCodeFiles(
  owner: string,
  repo: string,
  path: string = '',
  depth: number = 0,
  maxDepth: number = 3
): Promise<GitHubFile[]> {
  // Stop if we've gone too deep
  if (depth > maxDepth) {
    return [];
  }

  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'API-Doc-Generator',
      },
    }
  );

  const items: GitHubFile[] = response.data;
  const codeFiles: GitHubFile[] = [];

  for (const item of items) {
    // Skip unwanted directories
    if (item.type === 'dir') {
      const shouldSkip = [
        'node_modules',
        'test',
        '__tests__',
        'tests',
        '.git',
        'dist',
        'build',
        'coverage',
        'examples'
      ].some(skip => item.name.includes(skip));

      if (!shouldSkip) {
        // Recursively get files from subdirectory
        console.log(`📂 Exploring folder: ${item.path}`);
        const subFiles = await getAllCodeFiles(owner, repo, item.path, depth + 1, maxDepth);
        codeFiles.push(...subFiles);
      }
    } else if (item.type === 'file') {
      // Check if it's a code file
      const isCodeFile = ['.js', '.ts', '.jsx', '.tsx'].some(ext => item.name.endsWith(ext));
      const isTestFile = ['.test.', '.spec.'].some(test => item.name.includes(test));

      if (isCodeFile && !isTestFile) {
        codeFiles.push(item);
      }
    }
  }

  return codeFiles;
}

export async function getFileContent(downloadUrl?: string): Promise<string> {
  if (!downloadUrl) {
    throw new Error('Download URL is required');
  }
  
  const response = await axios.get(downloadUrl);
  return response.data;
}

export function extractOwnerRepo(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }
  
  const owner = match[1] as string;
  const repo = match[2] as string;
  
  return {owner,repo}  ;
}
