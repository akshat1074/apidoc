import {Response} from 'express';

export class AppError extends Error{
    statusCode:number;
    isOperational:boolean;

    constructor(message:string,statusCode:number){
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this,this.constructor)
    }
}

export const errorHandler = (error:any,res:Response) => {
    if (error instanceof AppError){
        return res.status(error.statusCode).json({
            status:'error',
            message:error.message
        });
    }

    console.error("Unexpected Error",error)

    return res.status(500).json({
        status:'error',
        message:'Something went wrong.Please try again later.'
    })
}