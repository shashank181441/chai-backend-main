import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    if (!name) throw new ApiError(400, "Name is compulsory")

    const userId = req.user._id
    const createPlay = await Playlist.create({ name, description, owner: userId, videos: [] })

    if (!createPlay) {
        throw new ApiError(400, "couldn't create the playlist")
    }

    return res.status(200).json(new ApiResponse(200, createPlay, "Playlist created successfully"))
    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    const playlists = await Playlist.findMany({ owner: userId })
    if (!playlists) {
        throw new ApiError(400, "No playlist found")
    }

    return res.status(200).json(new ApiResponse(200, playlists, "Playlist fetched successfully"))

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    const playlists = await Playlist.findById(playlistId)
    if (!playlists) {
        throw new ApiError(400, "No playlist found")
    }

    return res.status(200).json(new ApiResponse(200, playlists, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    const alreadyPresent = await Playlist.findOne({ _id: playlistId })
    const getIt = alreadyPresent.videos.includes(videoId)
    if (getIt) {
        throw new ApiError(300, "Video already present in the playlist")
    }
    if (alreadyPresent.owner !== req.user._id) throw new ApiError(401, "Unauthorized access")
    alreadyPresent.videos.push(videoId)
    const newVideoList = alreadyPresent.videos

    const addVideo = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set: {
                videos: newVideoList,
            },
        }, { new: true })
    return res.status(200).json(new ApiResponse(200, playlists, "Video added to Playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    const alreadyPresent = await Playlist.findOne({ _id: playlistId })
    const getIt = alreadyPresent.videos.includes(videoId)

    if (alreadyPresent.owner !== req.user._id) throw new ApiError(401, "Unauthorized access")
    if (!getIt) {
        throw new ApiError(300, "Video not present in the playlist")
    }
    const newList = alreadyPresent.videos.filter((video) => video != videoId)

    const addVideo = await Playlist.findByIdAndUpdate(playlistId, {
        $set: {
            videos: newVideoList
        }
    }, { new: true })

    return res.status(200).json(new ApiResponse(200, playlists, "Video removed from Playlist successfully"))


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
    const findPlay = await Playlist.findByIdAndDelete(playlistId)
    if (!findPlay) {
        throw new ApiError(400, "Playlist not found")
    }
    return res.status(200).json(new ApiResponse(200, findPlay, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist
    let updatingPart = {}
    if (!name && !description) throw new ApiError(400, "No data passed")
    else if (!name) updatingPart = { name }
    else if (!description) updatingPart = { description }
    else updatingPart = { name, description }

    const findPlay = await Playlist.findByIdAndUpdate(playlistId, {
        $set:
            updatingPart
    }, { new: true })
    if (!findPlay) {
        throw new ApiError(400, "Playlist not found")
    }
    return res.status(200).json(new ApiResponse(200, findPlay, "Playlist updated successfully"))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
