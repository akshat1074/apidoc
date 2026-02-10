import Queue from 'bull';
import redis from './redis';

export const documentationQueue = new Queue('documentation-generation',{
    redis:{
        host:process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')

    },
});