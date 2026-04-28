const validate = (schema)=> async (req,res,next)=>{
    try {
        // Check if req.body exists and is not undefined
        if (!req.body) {
            const status = 422;
            const message = "Request body is required";
            const error = {
                status,
                message,
                extraDetail: "Request body cannot be empty",
            }
            return next(error);
        }
        
        console.log('req.body => ', req.body);
        const parseBody = await schema.parseAsync(req.body);
        // console.log('parseBody => ', parseBody);
        req.body=parseBody;
        next();
    } catch (err) {
        const status= 422;
        const message ="Fill the input properly";
        console.log('err => , ', err);
        const  extraDetail = err.errors[0]?.message || err.message;
        const error={
            status,
            message,
            extraDetail,
        }
        next(error);
    }
}
module.exports = validate;
