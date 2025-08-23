import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiErrors } from '../utils/ApiErrors.js';
import {User} from '../models/user.model.js';
import {uploadonCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
   const { fullName, username, email, password } = req.body;
   console.log("email:", email);
   if(
       [fullName, username, email, password].some((field) => 
    field?.trim() === ""))
        {
       throw new ApiErrors(400,"full name is required");
   }

   const existedUser = await User.findOne({
      $or : [
        {username},
        {email}
      ]
    });

   if (existedUser) {
      throw new ApiErrors(409, "User already exists");
   }

   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

   if(!avatarLocalPath) {
      throw new ApiErrors(400,"Avatar is required");
   }


   await uploadonCloudinary(avatarLocalPath);
   await uploadonCloudinary(coverImageLocalPath);

   if(!avatar) {
      throw new ApiErrors(400,"Avatar is required");
   }


   User.create({
      fullName,
      username:username.toLowerCase(),
      email,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || " "
   })

  const createdUser = User.findById(username._id).select("-password refreshToken")

  if(!createdUser) {
    throw new ApiErrors(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser,"User registered successfully")
  )


});
   export { registerUser };