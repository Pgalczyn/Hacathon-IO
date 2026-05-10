import type {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Token not found' });
    }
    try{
        (req as any).userInfo = jwt.verify(token,process.env.JWT_SECRET as string);

        next()
    }
    catch(err){
        return res.status(401).json({ error: 'Session expired' });
    }
}