const jwt = require('jsonwebtoken');

const checkToken = (req, res, next) => {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            const error = new Error("Not authenticated.");
            error.statusCode = 401;
            throw error;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error("JWT_SECRET is not set");
        }
        let token = req.get("Authorization").split(" ")[1];
        let decodedToken = jwt.verify(token, secret);
        if(!decodedToken){
            const error = new Error("Not authenticated.");
            error.statusCode = 401;
            throw error;
        }        
    
        req.userId = decodedToken.id;
        req.role = decodedToken.role;
        next();
        
    } catch (err) {
        console.log("token error ",err);
        err.statusCode = 500;
        next(err)
    }

}

module.exports = {
    checkToken
};