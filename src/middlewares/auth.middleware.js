import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import jwt from "jsonwebtoken";


export const verifyJwt = asyncHandler(async (req, res, next) => {
   try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
 
     if(!token) {
         throw new ApiErrors(401,"Unauthorized Access")
     }
    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
 
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
    if(!user) {
        throw new ApiErrors(404,"User Not Found")
    }
    req.user = user;
    next();
   } catch (error) {
     throw new ApiErrors(401,"Unauthorized Access");
   }
});