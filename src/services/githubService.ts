import axios from 'axios';

interface GitHubFile {
    name:string;
    path:string;
    content?:string;
    type:'file'|'dir'
}

export async function getRepositoryFiles(repoUrl:string):Promise<GitHubFile[]>{
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);

    if(!match){
        throw new Error('Invalid GitHub URL')
    }

    const [owner ,  repo] = match

    const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents`,
        {
            headers:{
                'Accept':'application/vnd.github.v3+json',
            },
        }
    );

    return response.data
}

export async function getFileContent(owner:string,repo:string,path:string):Promise<string>{
    const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
            headers:{
                "Accept":'application/vnd.github.v3+json',
            },
        }
    );

    const content = Buffer.from(response.data.content,'base64').toString('utf-8');
    return content
}