const adminMiddleware = async (req,res,next)=>{
    try {
        console.log("Admin middleware - user:", req.user?.email, "isAdmin:", req.user?.isAdmin);
        const adminRole = req.user.isAdmin;
        if(!adminRole){
            return res.status(403).json({message:"Access denied. User is not an admin."})
        }
        next();
    } catch (error) {
        console.error("Admin middleware error:", error);
        next(error);
    }

}
module.exports = adminMiddleware;