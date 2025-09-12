const jwt = require("jsonwebtoken");
const SECRET_KEY = "ABC";

const verifyToken = (req, res, next) => {
    console.log("Checking authorization...");  
    const token = req.headers["authorization"]?.split(" ")[1];  
    if (!token) {
        console.log("No token provided"); 
        return res.status(403).json({ error: "No token provided" });
    }
    try {
        console.log("Verifying token..."); 
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("Token verified successfully:", decoded);

        req.user = decoded;
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
          }
        next();
    } catch (error) {
        console.log("Error verifying token:", error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token has expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = { verifyToken };
