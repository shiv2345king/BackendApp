import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/sunbcriptions.model.js"
import {ApiErrors} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user?._id
    const channel = await Subscription.find({
        channel:channelId
    })
    if(!channel)
    {
        throw new ApiErrors("Channel does not exists")
    }
    const subscriber = await User.findById(userId)
    if(!subscriber)
    {
        throw new ApiErrors(400,"Please register")
    }
    const subscribe = await Subscription.create({
        subscriber,
        channel,
    })

    return res.status(200).json({message:"Channel Subscribed",data:subscribe})
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiErrors(400, "Please register and login");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $project: {
                _id: 0,
                subscriber: 1,
                channel: 1,
                subscriberDetails: {
                    _id: 1,
                    username: 1,
                    email: 1,
                }
            }
        }
    ]);

    return res.status(200).json({
        message: "Subscribers fetched successfully",
        data: subscribers
    });
});


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiErrors(400, "Please register and login");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",              // joining with users collection
                localField: "channel",      // channel field in Subscription
                foreignField: "_id",        // _id in users
                as: "channelDetails"
            }
        },
        {
            $unwind: "$channelDetails"     // flatten array from lookup
        },
        {
            $project: {
                _id: 0,
                channelId: "$channelDetails._id",
                channelName: "$channelDetails.username",
                email: "$channelDetails.email",
                createdAt: "$channelDetails.createdAt"
            }
        }
    ]);

    return res.status(200).json({
        message: "Subscribed channels fetched successfully",
        data: subscribedChannels
    });
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}