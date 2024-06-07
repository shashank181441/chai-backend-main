import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to subscribe. Must be logged in")
    }

    const findifpres = await Subscription.findOne({ likedBy: userId, video: videoId })
    let toggleSub
    if (findifpres) {
        toggleSub = await Subscription.findByIdAndDelete(findifpres._id)
    } else {
        toggleSub = await Subscription.create({ video: videoId, likedBy: userId })
    }

    if (!toggleSub) {
        throw new ApiError(401, "failed to update subscription")
    }

    return res.status(200).json(new ApiResponse(200, "Subscribed channel Successfully"))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    const subscribers = await Subscription.findMany({ channel: channelId })
    if (!subscribers) throw new ApiError(400, "No subscribers found")

    return res.status(200).json(new ApiResponse(200, subscribers, "Channel Subscribers fetched"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    const subscribed = await Subscription.findMany({ subscriber: subscriberId })
    if (!subscribed) throw new ApiError(400, "No channels found")

    return res.status(200).json(new ApiResponse(200, subscribed, " Subscribed Channels fetched"))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}