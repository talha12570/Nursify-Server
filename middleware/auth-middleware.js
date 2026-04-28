const jwt = require("jsonwebtoken");
const User = require("../modals/user-modals");

const authMiddleware =async (req,res,next) =>{
    const token = req.headers?.authorization;
    
    console.log("Auth middleware - Authorization header:", token ? "Present" : "Missing");
    
    if(!token) {
        return res.status(401).json({message:"Unauthorized HTTP, Token not provided"});
    }
    
    const jwtToken = token.split(" ")[1];
    
    if(!jwtToken) {
        return res.status(401).json({message:"Unauthorized HTTP, Invalid token format"});
    }
    
    try {
        const isVerified = await jwt.verify(jwtToken, process.env.JWT_SECRET_KEY);
        const userData = await User.findOne({email:isVerified.email})
        .select({
            password:0,
            confirmPassword:0,
        })

        if(!userData) {
            return res.status(401).json({message:"Unauthorized HTTP, User not found"});
        }

        req.user = userData;
        console.log("Auth middleware - User authenticated:", userData.email, "isAdmin:", userData.isAdmin);

        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message);
        return res.status(401).json({message:"Unauthorized HTTP, Invalid token", error: error.message});
    }

};

module.exports = authMiddleware;