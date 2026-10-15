import jwt from 'jsonwebtoken';
export const authenticateToken=(req,res,next)=>{const token=req.headers.authorization?.split(' ')[1]; if(!token)return res.status(401).json({message:'Authentication required'}); try{req.user=jwt.verify(token,process.env.JWT_SECRET);next()}catch{return res.status(403).json({message:'Invalid or expired token'})}};
export const authorizeRoles=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:'Insufficient permissions'});
