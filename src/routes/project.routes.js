import { Router } from "express";
import { addMemberToProject, createProject, deleteMember, deleteProject, getProjectById, getProjectMembers, getProjects, updateMemberRole, updateProject } from "../controllers/project.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("project").get(getProjects)
router.route("project/:projectId").get(getProjectById)
router.route("/").post(createProject)
router.route("/:projectId").patch(updateProject)
router.route("/:projectId").delete(deleteProject)
router.route("project-member/:projectId").get(getProjectMembers)
router.route("add-member/:projectId").post(addMemberToProject)
router.route("delete-member/:projectId/:userId").delete(deleteMember)
router.route("update-role/:projectId/:userId").patch(updateMemberRole)

export default router