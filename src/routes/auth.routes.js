import { Router } from "express";
import { registerUser } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { userRegistrationValidator } from "../validators/index.js";
import {upload} from "../middlewares/multer.middleware.js"


const router = Router();

router.route("/register")
.post(upload.single("avatar"),userRegistrationValidator(), validate, registerUser);

export default router;
