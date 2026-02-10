import 'dotenv/config';
import { documentationQueue } from './config/queue';
import prisma from './config/database';

documentationQueue.process(async (job)=>{
    console.log(`Processing job ${job.id}`);

    const {jobId,githubUrl} = job.data;

    try{
        await prisma.job.update({
            where:{id:jobId},
            data:{status:'processing'}
        });

        await new Promise(resolve => setTimeout(resolve,5000));

        await prisma.documentation.create({
            data:{
                jobId,
                content:{message:'Documentation generated', url: githubUrl},
            },
        });

        await prisma.job.update({
            where:{id:jobId},
            data:{status:'completed'},
        });
        console.log(`Job ${job.id} completed`);
    }catch(error){
        console.error(`Job ${job.id} failed:`,error)

        await prisma.job.update({
            where:{id:jobId},
            data:{status:'failed'},
        });

        throw error
    }

});

console.log('Worker started and listening for jobs...')