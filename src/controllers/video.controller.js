import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
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
    const { videoId } = req.params;

    // Increment views
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    // MongoDB aggregation pipeline
    const videoAggregate = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }
        },
        { $unwind: '$owner' },
        {
            $lookup: {
                from: 'subscriptions',
                let: { owner_id: '$owner._id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$$owner_id', '$channel'] },
                                    { $eq: ['$subscriber', new mongoose.Types.ObjectId(req.user?._id)] }
                                ]
                            }
                        }
                    }
                ],
                as: 'subscriptionVal'
            }
        },
        {
            $lookup: {
                from: 'likes',
                let: { video_id: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$$video_id', '$video'] },
                                    { $eq: ['$likedBy', new mongoose.Types.ObjectId(req.user?._id)] }
                                ]
                            }
                        }
                    }
                ],
                as: 'likeVal'
            }
        },
        {
            $addFields: {
                isSubscribed: { $gt: [{ $size: '$subscriptionVal' }, 0] },
                isLiked: { $gt: [{ $size: '$likeVal' }, 0] }
            }
        },
        {
            $project: {
                'owner.password': 0, // Exclude sensitive fields
                subscriptionVal: 0,
                likeVal: 0
            }
        }
    ]);

    // Check if video exists
    if (!videoAggregate || videoAggregate.length === 0) {
        throw new ApiError(400, "No video found");
    }

    const videoData = videoAggregate[0];

    // Update watch history if user is logged in
    if (req.user) {
        const userId = req.user._id;

        // Fetch the user's watch history
        const user = await User.findById(userId);
        const watchHistory = user.watchHistory || [];

        // Remove the videoId if it exists in the watch history
        const updatedWatchHistory = watchHistory.filter(id => !id.equals(videoId));

        // Add the videoId to the beginning of the watch history
        updatedWatchHistory.unshift(new mongoose.Types.ObjectId(videoId));

        // Update the user's watch history in the database
        await User.findByIdAndUpdate(userId, { watchHistory: updatedWatchHistory });
    }

    return res.status(200).json(new ApiResponse(200, videoData, "Video fetched successfully"));
});


export const getWatchHistoryVideos = asyncHandler(async(req, res)=>{
    const userId = req.user?._id
    const videoIds = req.user.watchHistory
    

    // Validate input
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
        throw new ApiError(400, "videoIds must be a non-empty array");
    }

    // Ensure all IDs are valid MongoDB ObjectIds
    const validVideoIds = videoIds.map(id => {
        if (mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
        } else {
            throw new ApiError(400, `Invalid ObjectId: ${id}`);
        }
    });

    // MongoDB aggregation pipeline
    const videos = await Video.aggregate([
        { $match: { _id: { $in: validVideoIds } } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            }
        },
        { $unwind: '$owner' },
        {
            $project: {
                'owner.password': 0, // Exclude sensitive fields
                'owner.email': 0,
                "owner.refreshToken": 0, 
                "owner.coverImage": 0, 
                "owner.watchHistory": 0, 
                "owner.createdAt": 0, 
                "owner.updatedAt": 0
                // "owner.username":1, "owner.avatar": 1, "owner.fullName": 1, "owner._id":1
            }
        }
    ]);


                // "coverImage": "http://res.cloudinary.com/dd9l1c8cr/image/upload/v1705503026/rcwbm9vjv95fgr1fvmnp.jpg",
                // "watchHistory": [
                //     "65a810df2b5e2ff0581c16d0",
                //     "666338469eda92a0f339721b"
                // ],
                // "createdAt": "2024-01-17T14:50:26.708Z",
                // "updatedAt": "2024-06-14T08:04:08.574Z",
                // "__v": 0

    // Check if videos exist
    if (!videos || videos.length === 0) {
        throw new ApiError(404, "No videos found");
    }

    return res.status(200).json(new ApiResponse(200, videos, "Video fetched successfully"));
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


// const getVideoById = asyncHandler(async (req, res) => {
//     const { videoId } = req.params;

//     // Increment views and fetch the video
//     const video = await Video.findByIdAndUpdate(
//         videoId,
//         // { $inc: { views: 1 } }, // Increment the views by 1
//         { new: true } // Return the updated document
//     ).populate('owner', 'username fullName avatar _id'); // Populate owner details

//     // Check if video exists
//     if (!video) throw new ApiError(400, "No video found");

//     // Initialize isSubscribed flag
//     let isSubscribed = false, isLiked= false;

//     // Check if user is logged in and subscribed to the channel
//     if (req.user) {
//         const subscriptionVal = await Subscription.findOne({ subscriber: req.user._id, channel: video.owner._id})
//         console.log(video.owner)
//         if (subscriptionVal) {
//             isSubscribed = true;
//         }else isSubscribed = false;

//         const likeVal = await Like.findOne({ video: videoId, likedBy: req.user._id })

//         if (likeVal) {
//             isLiked = true;
//         }else isLiked = false;
//     }



//     // Attach the isSubscribed flag to the video data
//     const videoData = { ...video.toObject(), isSubscribed, isLiked };

//     return res.status(200).json(new ApiResponse(200, videoData, "Video fetched successfully"));
// });
