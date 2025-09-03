import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import {ApiErrors} from '../utils/ApiErrors.js';
import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiErrors(500, "Something went wrong while generating referesh and access token")
    }
}
const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiErrors(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiErrors(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiErrors(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiErrors(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase() 
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiErrors(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )
  
const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body || {};

    if ((!username && !email) || !password) {
        throw new ApiErrors(400, "Username/Email and password are required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiErrors(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiErrors(401, "Invalid credentials");
    }

    // generate tokens using helper
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
});


const refreshAccessToken = asyncHandler(async (req, res) => {
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
     if (!incomingRefreshToken) {
        throw new ApiErrors(400, "Refresh token is required");
     }
  try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user  =  await User.findById(decodedToken?._id);
    if(!user) {
        throw new ApiErrors(404,"Invalid refresh token");
    }
   
     if(user?.refreshToken !== incomingRefreshToken) {
         throw new ApiErrors(403,"Forbidden");
     }
 
     const options = { 
         httpOnly: true,
         secure: true
     };
 
     // generate new access token
     const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id);
 
     return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newRefreshToken,options).json(
         new ApiResponse(200, { accessToken, newRefreshToken }, "Access token refreshed successfully")
     );
   } catch (error) {
       throw new ApiErrors(401, error?.message || "Invalid Refresh Token");
   }
});

const changeCurrentPassword  = asyncHandler(async (req,res) => {
    const {oldPassword,newPassword,confPassword} = req.body

if(newPassword !== confPassword) {
    throw new ApiErrors(400,"New password and confirmation password must match");
}

const user = await User.findById(req.user?._id)
const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
if(!isPasswordCorrect) {
    throw new ApiErrors(400,"Old password is incorrect");

}

user.password = newPassword;
await user.save({ validateBeforeSave: false });

return res.status(200)
.json(new ApiResponse(200,{user},"Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName,email} = req.body;
    if(!fullName || ! email) {
       
          throw new ApiErrors(400,"Full name and email are required");
    }
   const user = await User.findByIdAndUpdate(req.user._id,{
    $set: {
        fullName,
        email: email
    }
   },{new : true}).select("-password")

   return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocal = req.file?.avatar.path
    if(!avatarLocal) {
        throw new ApiErrors(400,"Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocal)

    if(!avatar.url) {
        throw new ApiErrors(400,"Failed to upload avatar");
    }
    const user = await User.findByIdAndUpdate(req.user._id,{
        $set: {
            avatar: avatar.url
        }
    },{new : true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully"));
});
const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocal = req.file?.coverImage.path
    if(!coverImageLocal) {
        throw new ApiErrors(400,"Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocal)

    if(!coverImage.url) {
        throw new ApiErrors(400,"Failed to upload cover image");
    }
    const user = await User.findByIdAndUpdate(req.user._id,{
        $set: {
            coverImage: coverImage.url
        }
    },{new : true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User cover image updated successfully"));
});
const deleteLocalFiles = asyncHandler(async(req,res) => {
    const avatarFilePath = req.file?.avatar.path
    const coverImageFilePath = req.file?.coverImage.path

    if(avatarFilePath) {
       try {
         fs.unlink(avatarFilePath)
       } catch (error) {
           console.error("Error deleting avatar file:", error);
       }
    }

    if(coverImageFilePath) {
      try {
          fs.unlink(coverImageFilePath)
      } catch (error) {
          console.error("Error deleting cover image file:", error);
      }
    }
});

const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiErrors(400,"Username is required");
    }

   const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(), 
      },
    },
    {
      $lookup: {
        from: "subscriptions", 
        localField: "_id",     
        foreignField: "channel", 
        as: "subscribers",     
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",    
        foreignField: "subscriber",
        as: "subscribedTo",    
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" }, 
        channelSubscribedToCount: { $size: "$subscribedTo" }, 
        isSubscribed: {
            $cond: {
                if: {
                    $in:[req.user?._id, "$subscribers.subscriber"]
                },
                then : true,
                else: false,
            }
        }
      },
        
    },
    {
        $project: {
            fullName:1,
            username:1,
            avatar:1,
            coverImage:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubscribed:1,
            email:1,
        }
    }


  ]);
  if(!channel?.length) {
    throw new ApiErrors(404,"Channel not found");
  }

  return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"));

})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            _id: new mongoose.ObjectId(req.user?._id)
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar:1,
                                        coverImage:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner:{
                                $first: "$owner",
                            },
                        },
                    },

                ]
            },
        },
    ])

    return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory || [], "Watch history fetched successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  deleteLocalFiles,
  getUserChannelProfile,
  getWatchHistory,
}