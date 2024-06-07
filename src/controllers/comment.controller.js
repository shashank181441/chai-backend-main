import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                },
                isLiked: 1
            },
        },
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});



const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    // todos: check if user logged in or not

    const { content } = req.body
    if (!content) throw new ApiError(400, "Content is important")
    const { videoId } = req.params
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to post a comment. Must be logged in")
    }
    const commentpost = await Comment.create({
        content, owner: userId, video: videoId
    }, { new: true })
    if (!commentpost) {
        throw new ApiError(400, "Error while uploading comment")
    }
    return res.status(200).json(new ApiResponse(200,
        commentpost
        , "Comment posted successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { content } = req.body
    if (!content) throw new ApiError(400, "Content is important")
    const { commentId } = req.params

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to update a comment. Must be logged in")
    }

    const updaterCheck = await Comment.findById(commentId)
    if (updaterCheck.owner == userId) {
        throw new ApiError(401, "Not authorized to update this comment.")
    }

    const updatecmnt = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,
            },
        }, { new: true }
    )
    if (!updatecmnt) {
        throw new ApiError(400, "Update unsuccessful")
    }

    return res.status(200).json(new ApiResponse(200, updatecmnt, "Comment updated Successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(401, "Not authorized to post a comment. Must be logged in")
    }
    const updaterCheck = await Comment.findById(commentId)

    if (updaterCheck.owner == userId) {
        throw new ApiError(401, "Not authorized to delete this comment.")
    }

    const delCmnt = await Comment.findByIdAndDelete(commentId)
    if (!delCmnt) {
        throw new ApiError(400, "Deletion unsuccessful")
    }

    return res.status(200).json(new ApiResponse(200, { delCmnt }, "Comment deleted Successfully"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
