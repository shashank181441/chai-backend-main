import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    console.log(channelId) 
    // TODO: toggle subscription

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to subscribe. Must be logged in")
    }

    const findifpres = await Subscription.findOne({ subscriber: userId, channel: channelId})
    let toggleSub, myMessage
    if (findifpres) {
        toggleSub = await Subscription.findByIdAndDelete(findifpres._id)
        myMessage = "Channel unsubscribed"
    } else {
        toggleSub = await Subscription.create({ subscriber: userId, channel: channelId })
        myMessage = "Channel subscribed"
    }

    if (!toggleSub) {
        throw new ApiError(401, "failed to update subscription")
    }

    return res.status(200).json(new ApiResponse(200, toggleSub, myMessage))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = await req.params

    let message;

    const subscribers = await Subscription.find({ channel: channelId })
    if (!subscribers ) throw new ApiError(400, "No subscribers found")
    if (subscribers.length == 0) {
        message = "No subscribers found"
    }else{
        message = "Channel Subscribers fetched"
    }

    return res.status(200).json(new ApiResponse(200, subscribers, message))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = await req.params

    let message

    const subscribed = await Subscription.find({ subscriber: subscriberId })
    if (!subscribed) throw new ApiError(400, "No channels found")
    if (subscribed.length == 0) {
        message = "No subscribed found"
    }else{
        message = "Subscribed Channels fetched"
    }

    return res.status(200).json(new ApiResponse(200, subscribed, message))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}