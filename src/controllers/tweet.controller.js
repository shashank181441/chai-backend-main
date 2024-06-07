import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet

    const { content } = req.body
    if (!content) throw new ApiError(400, "Content is important")

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to post a comment. Must be logged in")
    }

    const postTweet = await Tweet.create({
        content, owner: userId
    })
    if (!postTweet) {
        throw new ApiError(400, "Error while uploading tweet")
    }
    return res.status(200).json(new ApiResponse(200, {
        tweet: content, postTweet
    }, "Comment posted successfully"))

})


const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets


    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to get user tweets. Must be logged in")
    }
    const getTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'userDetails',
            },
        },
        {
            $unwind: '$userDetails',
        },
        {
            $project: {
                _id: 1, // Include the _id field if needed
                tweet: 1,
                ownerDetails: {
                    _id: '$userDetails._id',
                    fullName: '$userDetails.fullName',
                    username: '$userDetails.username',
                    avatar: '$userDetails.avatar',
                    coverImage: "$userDetails.coverImage"
                    // Include other fields you need from the User collection
                },
                createdAt: 1,
                updatedAt: 1,
                __v: 1,
            },
        },
    ]);


    if (getTweets.length === 0) {
        throw new ApiError(400, "No Tweets found")
    }

    return res.status(200).json(new ApiResponse(200, getTweets, "Got all Tweets Successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body
    if (!content) throw new ApiError(400, "Content is important")

    const userId = req.user?._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to get user tweets. Must be logged in")
    }

    const getTweets = await Tweet.findOneAndUpdate({ _id: tweetId, owner: userId }, {
        $set: { content }
    }, { new: true })
    if (!getTweets) {
        throw new ApiError(400, "Tweet not found or you are not the owner of this tweet")
    }
    return res.status(200).json(200, new ApiResponse(200, getTweets, "Updated Successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to get user tweets. Must be logged in")
    }
    const getTweets = await Tweet.findOneAndDelete({ _id: tweetId, owner: userId }, { new: true })
    if (!getTweets) {
        throw new ApiError(400, "Tweet not found or user not authenticated")
    }
    return res.status(200).json(200, new ApiResponse(200, getTweets, "Deleted Successfully"))
})


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
