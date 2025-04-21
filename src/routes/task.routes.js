import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createSubTask, createTask, deleteSubTask, deleteTask, getTaskById, getTasks, updateSubTask, updateTask } from "../controllers/task.controllers.js";
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/:projectId").get(getTasks)
router.route("/:taskId").get(getTaskById)
router.route("/").post(upload.array("attachments"),createTask)
router.route("/:taskId").patch(upload.array("attachments"),updateTask)
router.route("/:taskId").delete(deleteTask);
router.route("/subTask").post(createSubTask);
router.route("/subTask/:subtaskId").patch(updateSubTask);
router.route("/subTask/:subtaskId").patch(deleteSubTask);


export default router