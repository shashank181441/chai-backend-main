import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;

    // Define the sort order
    const sortOrder = sortType === 'desc' ? -1 : 1;

    // Construct the match stage
    const matchStage = { isPublished: true };

    if (query) {
        matchStage.$text = { $search: query };
    }

    if (userId) {
        matchStage.owner = userId;
    }

    // Define the aggregation pipeline
    const pipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: 'users', // Name of the user collection
                localField: 'owner', // Field in the video collection
                foreignField: '_id', // Field in the user collection
                as: 'ownerDetails' // Output array field
            }
        },
        { $unwind: '$ownerDetails' },
        { $sort: { [sortBy]: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit, 10) }
    ];

    try {
        const allVideos = await Video.aggregate(pipeline);

        if (!allVideos || allVideos.length === 0) {
            throw new ApiError(400, "Videos not found");
        }

        return res.status(200).json(new ApiResponse(200, allVideos, "Videos fetched successfully"));
    } catch (error) {
        return res.status(500).json(new ApiError(500, error.message));
    }
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    if (title.length === 0 || description.length === 0) throw new ApiError(400, "Title or description missing")


    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail required file is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) throw new ApiError(400, "Thumbnail not uploaded")

    const videoLocalPath = req.files?.videoFile[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "videoLocalPath file is required")
    }

    const video = await uploadOnCloudinary(videoLocalPath)

    if (!video) throw new ApiError(400, "Video not uploaded")

    const videoUpload = await Video.create({
        videoFile: video.url, title, description, thumbnail: thumbnail.url, owner: req.user?.id, duration: video.duration
    })

    if (!videoUpload) {
        throw new ApiError(400, "Problem occured during uploading details to database")
    }

    return res.status(200).json(new ApiResponse(200, videoUpload, "Video uploaded successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } }, // Increment the views by 1
        { new: true } // Return the updated document
    ).populate('owner', 'username fullName avatar'); // Populate owner details

    if (!video) throw new ApiError(400, "No video found")

    

    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body


    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail) throw new ApiError(400, "Thumbnail not uploaded")
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (thumbnailLocalPath) updateFields.thumbnail = thumbnail;

    // Check if at least one field is provided
    if (Object.keys(updateFields).length === 0) {
        throw new ApiError(400, "At least enter one field to update");
    }

    const videoUpdate = await Video.findByIdAndUpdate(videoId, { $set: updateFields }, { new: true })

    return res.status(200).json(new ApiResponse(200, videoUpdate, "Vidoe details updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    const videoDeleted = await Video.findByIdAndDelete(videoId)
    if (!videoDeleted) throw new ApiError(400, "Either video not found or error occured while deleting Video")

    return res.status(200).json(new ApiResponse(200, videoDeleted, "Video Deleted Successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const videoData = await Video.findById(videoId)

    if (!videoData) throw new ApiError(400, "Video not found")

    let isPub = videoData.isPublished

    const updatedPublish = await Video.findByIdAndUpdate(videoId, {
        $set: { isPublished: !videoData.isPublished }
    }, { new: true })
    if (!updatedPublish) throw new ApiError(400, "Couldn't toggle publish button")

    return res.status(200).json(new ApiResponse(200, updatedPublish,))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
