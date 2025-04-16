import mongoose, { isValidObjectId } from "mongoose";
import { Project } from "../models/project.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { AvailableUserRoles } from "../utils/constants.js";

const getProjects = asyncHandler(async (req, res) => {
    // get all projects
    const getProject = await Project.find({ createdBy: req.user?._id });

    return res
        .status(200)
        .json(new ApiResponse(200, getProject, "get all project successfully"));
});

const getProjectById = asyncHandler(async (req, res) => {
    // get project by id
    const { projectId } = req.params;

    if (!projectId) {
        throw new ApiError(400, "Invalid project ID");
    }

    const getProjectById = await Project.findById(projectId);

    return res
        .status(200)
        .json(
            new ApiResponse(200, getProjectById, "project fetch successfully"),
        );
});

const createProject = asyncHandler(async (req, res) => {
    // create project
    const { name, description } = req.body;

    if (!name && !description) {
        throw new ApiError(400, "Name and Description are requred");
    }

    const project = await Project.create({
        name,
        description,
        createdBy: req.user?._id,
    });

    const projectCreated = await Project.findById(project._id);

    if (!projectCreated) {
        throw new ApiError(500, "projectCreated failed please try again !!!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                projectCreated,
                "project created successfully",
            ),
        );
});

const updateProject = asyncHandler(async (req, res) => {
    // update project
    const { name, description } = req.body;
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, "Invalid projectId");
    }

    if (!name && !description) {
        throw new ApiError(400, "Name and Description are requred");
    }

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "No Project Found");
    }

    const updateProject = await Project.findByIdAndUpdate(
        projectId,
        {
            $set: {
                name,
                description,
            },
        },
        { new: true },
    );

    if (!updateProject) {
        throw new ApiError(500, "Failed to update project please try again");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updateProject, "project updated successfully"),
        );
});

const deleteProject = asyncHandler(async (req, res) => {
    // delete project
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, "Invalid projectId");
    }

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "No Project Found");
    }

    const projectDeleted = await Project.findByIdAndDelete(project?._id);

    if (!projectDeleted) {
        throw new ApiError(
            400,
            "Failed to delete the project please try again",
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "project deleted successfully"));
});

const getProjectMembers = asyncHandler(async (req, res) => {
    // get project members

    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, "Invalid projectId");
    }

    const member = await ProjectMember.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
            },
        },
        {
            $unwind: "$user",
        },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "projectDetails",
            },
        },
        {
            $unwind: "$projectDetails",
        },
        {
            $project: {
                _id: 1,
                role: 1,
                createdAt: 1,
                "user._id": 1,
                "user.name": 1,
                "user.email": 1,
                "projectDetails._id": 1,
                "projectDetails.name": 1,
                "projectDetails.description": 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(200, member, "project member fetch successfully");
});

const addMemberToProject = asyncHandler(async (req, res) => {
    // add member to project

    const { projectId } = req.params;
    const { userId, role } = req.body;

    if (!isValidObjectId(projectId) || userId) {
        throw new ApiError(400, "Project ID and User ID are required");
    }

    // Check if user is already a member of the project
    const existingMember = await ProjectMember.findOne({
        project: projectId,
        user: userId,
    });

    if (existingMember) {
        throw new ApiError(400, "User is already a member of this project");
    }

    // Create new project member
    const newMember = await ProjectMember.create({
        project: projectId,
        user: userId,
        role: role || "member", // default to "member" if not specified
    });

    return res
        .status(201)
        .json(new ApiResponse(201, newMember, "Member added successfully"));
});

const deleteMember = asyncHandler(async (req, res) => {
    // delete member from project

    const { projectId, userId } = req.params;

    if (!projectId || !userId) {
        throw new ApiError(400, "Project ID and User ID are required");
    }

    const deleted = await ProjectMember.findOneAndDelete({
        project: projectId,
        user: userId,
    });

    if (!deleted) {
        throw new ApiError(404, "Member not found in project");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Member removed from project successfully",
            ),
        );
});

const updateMemberRole = asyncHandler(async (req, res) => {
    // update member role
    const { projectId, userId } = req.params;
    const { role } = req.body;

    if (!projectId || !userId || !role) {
        throw new ApiError(
            400,
            "Project ID, User ID, and new role are required",
        );
    }

    if (!AvailableUserRoles.includes(role)) {
        throw new ApiError(400, "Invalid role");
    }

    const member = await ProjectMember.findOneAndUpdate(
        { project: projectId, user: userId },
        { role },
        { new: true },
    );

    if (!member) {
        throw new ApiError(400, "Member not found in project");
    }

    return res.status(200).json(200, member, "Role updated successfully");
});

export {
    addMemberToProject,
    createProject,
    deleteMember,
    deleteProject,
    getProjectById,
    getProjectMembers,
    getProjects,
    updateMemberRole,
    updateProject,
};
