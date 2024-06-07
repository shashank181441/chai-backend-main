import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"

import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Tweet } from "../models/tweet.model.js"
import { Comment } from "../models/comment.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to like a video. Must be logged in")
    }

    const videoPresent = await Video.findById(videoId)
    if (!videoPresent) throw new ApiError(400, "Video not found")

    const findifpres = await Like.findOne({ likedBy: userId, video: videoId })
    let toggleLike
    if (findifpres) {
        toggleLike = await Like.findByIdAndDelete(findifpres._id)
    } else {
        toggleLike = await Like.create({ video: videoId, likedBy: userId })
    }

    if (!toggleLike) {
        throw new ApiError(401, "failed to update video like")
    }

    return res.status(200).json(new ApiResponse(200, toggleLike, findifpres ? "Disliked Video" : "Liked Video Successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to like a comment. Must be logged in")
    }


    const commentPresent = await Comment.findById(commentId)
    if (!commentPresent) throw new ApiError(400, "Comment not found")

    const findifpres = await Like.findOne({ likedBy: userId, comment: commentId })
    let toggleLike
    if (findifpres) {
        toggleLike = await Like.findByIdAndDelete(findifpres._id)
    } else {
        toggleLike = await Like.create({ comment: commentId, likedBy: userId })
    }

    if (!toggleLike) {
        throw new ApiError(401, "failed to update comment like")
    }

    return res.status(200).json(new ApiResponse(200, toggleLike, findifpres ? "Disliked successfully" : "Liked comment Successfully"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to like a tweet. Must be logged in")
    }

    const tweetPresent = await Tweet.findById(tweetId)
    if (!tweetPresent) throw new ApiError(400, "Video not found")

    const findifpres = await Like.findOne({ likedBy: userId, tweet: tweetId })
    let toggleLike
    if (findifpres) {
        toggleLike = await Like.findByIdAndDelete(findifpres._id)
    } else {
        toggleLike = await Like.create({ tweet: tweetId, likedBy: userId })
    }

    if (!toggleLike) {
        throw new ApiError(401, "failed to update tweet like")
    }

    return res.status(200).json(new ApiResponse(200, toggleLike, findifpres ? "Disliked tweet" : "Liked tweet Successfully"))

}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to get liked videos. Must be logged in")
    }
    const likedVids = await Like.find({
        likedBy: userId,
        video: { $exists: true }
    })

    if (likedVids === null || likedVids === undefined) {
        // Server error
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
        });
    }
    if (likedVids.length === 0) {
        throw new ApiError(400, "No liked Videos found")
    }

    return res.status(200).json(new ApiResponse(200, likedVids, "Got all liked Videos Successfully"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}