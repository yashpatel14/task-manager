import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createNote, deleteNote, getNoteById, getNotes, updateNote } from "../controllers/note.controllers.js";

const router = Router()

router.use(verifyJWT)

router.route("/:projectId").get(getNotes)
router.route("/:noteId").get(getNoteById)
router.route("/").post(createNote)
router.route("/:noteId").patch(updateNote)
router.route("/:noteId").delete(deleteNote)

export default router