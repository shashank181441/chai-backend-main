import { Router } from 'express';
import {
    getChannelStats,
    getChannelVideos,
    getUserChannelVideos
} from "../controllers/dashboard.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);
router.route("/videos/:userId").get(getUserChannelVideos);

export default router