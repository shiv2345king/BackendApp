import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiErrors } from "../utils/ApiErrors.js"



const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId
  } = req.query;

  console.log("Request query parameters:", req.query);

  // ---------- Filtering ----------
  const filter = {};
  if (query) filter.title = { $regex: query, $options: "i" };
  if (userId) filter.owner = userId; // Changed from 'user' to 'owner'

  console.log("Filter being applied:", filter);

  // ---------- Sorting ----------
  const sortOptions = {};
  sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

  console.log("Sort options:", sortOptions);

  // ---------- Pagination ----------
  const skip = (parseInt(page) - 1) * parseInt(limit);

  console.log("Pagination - Page:", page, "Limit:", limit, "Skip:", skip);

  // Debug: Check total videos in database
  const totalVideosInDB = await Video.countDocuments({});
  console.log("Total videos in DB (no filter):", totalVideosInDB);

  // ---------- Query ----------
  const videos = await Video.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(parseInt(limit))
    .populate("owner", "username fullName"); // Changed from 'user' to 'owner'

  console.log("Videos found with current filter:", videos.length);
  console.log("First video (if any):", videos[0]);

  const total = await Video.countDocuments(filter);
  console.log("Total count with filter:", total);

  // ---------- Response ----------
  res.status(200).json({
    success: true,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    videos,
  });
});



const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description,duration} = req.body

    //upload video on cloudinary
    const videoLocalPath = req.files?.videoFile[0].path
    const thumbnailLocalPath = req.files?.thumbnail[0].path
    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new ApiErrors(400, "Video file and thumbnail are required")
    }

    const videoUploadResponse = await uploadOnCloudinary(videoLocalPath)
    const thumbnailUploadResponse = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoUploadResponse || !thumbnailUploadResponse) {
        throw new ApiErrors(400,"Failed to upload video or thumbnail")
    }

    const newVideo = await Video.create({
        title,
        description,
        duration: Number(duration),
        videoFile: videoUploadResponse.url,
        thumbnail: thumbnailUploadResponse.url,
        user: req.user?._id,
        owner : req.user?._id,
        isPublished:true,
        views:0,
    })

   return res.status(201).json(new ApiResponse({ message: "Video published successfully", data: newVideo }))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const videoresponse = await Video.findById(videoId).populate("user", "username fullName")
    if (!videoresponse) {
        throw new ApiErrors(404,"Video not found")
    }
    return res.status(200).json(new ApiResponse({ message: "Video fetched successfully", data: videoresponse }))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;


    // Find the video
    const videoresponse = await Video.findById(videoId);
    if (!videoresponse) {
        console.log("❌ Video not found with ID:", videoId);
        throw new ApiErrors(404, "Video not found");
    }

    // Check if the current user owns this video
    if (videoresponse.owner.toString() !== req.user._id.toString()) {
        console.log("⚠️ Unauthorized update attempt by user:", req.user._id);
        throw new ApiErrors(403, "You can only update your own videos");
    }

    const { title, description, duration } = req.body;

    if (title) videoresponse.title = title;
    console.log("Current title:", videoresponse.title);
    if (description !== undefined) {
        videoresponse.description = description;
}
    if (duration) videoresponse.duration = Number(duration);

    // Handle thumbnail update
    if (req.file) {
        const thumbnailLocalPath = req.file.path;
       
        const thumbnailUploadResponse = await uploadOnCloudinary(thumbnailLocalPath);
        

        if (!thumbnailUploadResponse) {
            throw new ApiErrors(400, "Failed to upload thumbnail");
        }

        // Be careful: could be .url or .secure_url
        videoresponse.thumbnail = thumbnailUploadResponse.secure_url || thumbnailUploadResponse.url;
       
    }

    try {
        await videoresponse.save();
        console.log("✅ Video updated successfully:", videoresponse);
    } catch (err) {
        console.error("💥 Error saving video:", err);
        throw new ApiErrors(400, err.message);
    }

    return res.status(200).json(
        new ApiResponse(200, videoresponse, "Video updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const videoresponse = await Video.findById(videoId)
    if (!videoresponse) {
        throw new ApiErrors(404,"Video not found")
    }

    await Video.findByIdAndDelete(videoId)
    return res.status(200).json(new ApiResponse({ message: "Video deleted successfully" }))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const videoresponse = await Video.findById(videoId)
    if (!videoresponse) {
        throw new ApiErrors(404,"Video not found")
    }
    videoresponse.isPublished = !videoresponse.isPublished
    await videoresponse.save()
    return res.status(200).json(new ApiResponse({ message: "Video publish status toggled successfully", data: videoresponse }))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}