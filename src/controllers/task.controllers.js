import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Task } from "../models/task.models";
import { ApiResponse } from "../utils/ApiResponse";
import { Project } from "../models/project.models";
import { User } from "../models/user.models";
import { UserRolesEnum } from "../utils/constants";
import { SubTask } from "../models/subtask.models";

// get all tasks
const getTasks = asyncHandler(async (req, res) => {
    // get all tasks
    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
        throw new ApiError(400, "Project ID is required");
    }

    const task = await Task.aggregate([
        {
            $match: {
                project: new mongoose.Types.ObjectId(projectId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedTo",
            },
        },
        {
            $unwind: "$assignedTo",
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedBy",
                foreignField: "_id",
                as: "assignedBy",
            },
        },
        {
            $unwind: "$assignedBy",
        },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "projectDetails",
            },
        },
        { $unwind: "$projectDetails" },
        {
            $project: {
                title: 1,
                description: 1,
                status: 1,
                attachments: 1,
                createdAt: 1,
                updatedAt: 1,
                "assignedTo._id": 1,
                "assignedTo.name": 1,
                "assignedTo.email": 1,
                "assignedBy._id": 1,
                "assignedBy.name": 1,
                "assignedBy.email": 1,
                "project._id": 1,
                "project.name": 1,
            },
        },
    ]);

    return res.status(200).json(200, task, "task fatch successfully");
});

// get task by id
const getTaskById = asyncHandler(async (req, res) => {
    // get task by id

    const { taskId } = req.params;

    if (!isValidObjectId(taskId)) {
        throw new ApiError(400, "Invalid taskId");
    }

    const task = await Task.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(taskId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "assignedTo",
                foreignField: "_id",
                as: "assignedTo",
            },
        },
        { $unwind: "$assignedTo" },
        {
            $lookup: {
                from: "users",
                localField: "assignedBy",
                foreignField: "_id",
                as: "assignedBy",
            },
        },
        { $unwind: "$assignedBy" },
        {
            $lookup: {
                from: "projects",
                localField: "project",
                foreignField: "_id",
                as: "projectDetails",
            },
        },
        { $unwind: "$projectDetails" },
        {
            $project: {
                title: 1,
                description: 1,
                status: 1,
                attachments: 1,
                createdAt: 1,
                updatedAt: 1,
                "assignedTo._id": 1,
                "assignedTo.name": 1,
                "assignedTo.email": 1,
                "assignedBy._id": 1,
                "assignedBy.name": 1,
                "assignedBy.email": 1,
                "project._id": 1,
                "project.name": 1,
            },
        },
    ]);

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, task, "task fetch successfully"));
});

// create task
const createTask = asyncHandler(async (req, res) => {
    // create task
    const { title, description, project, assignedTo, status } = req.body;

    if (!title || !project || !assignedTo) {
        throw new ApiError(400, "Title, project, and assignedTo are required.");
    }

    const existingProject = await Project.findById(project);

    if (!existingProject) {
        throw new ApiError(404, "Project not found.");
    }

    const userToAssigned = await User.findById(assignedTo);

    if (!userToAssigned) {
        throw new ApiError(400, "Assigned user not found.");
    }

    if (
        ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(
            req.user.role,
        )
    ) {
        throw new ApiError(403, "You do not have permission to create tasks.");
    }

    let attachments = [];

    if (req.files && req.files.length > 0) {
        attachments = req.files.map((file) => ({
            url: `${req.protocol}://${req.get("host")}/${file.path}`,
            mimetype: file.mimetype,
            size: file.size,
        }));
    }

    const task = await Task.create({
        title,
        description,
        project,
        assignedTo,
        assignedBy: req.user._id,
        status,
        attachments,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task created successfully"));
});

// update task
const updateTask = asyncHandler(async (req, res) => {
    // update task
    const { taskId } = req.params;
    const { title, description, project, assignedTo, status } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    if (project) {
        const projectExists = await Project.findById(project);

        if (!projectExists) {
            throw new ApiError(404, "Project not found");
        }
    }

    if (assignedTo) {
        const userExists = await User.findById(assignedTo);
        if (!userExists) {
            throw new ApiError(404, "Assigned user not found");
        }
    }

    let newAttachments = [];
    if (req.files && req.files.length > 0) {
        newAttachments = req.files.map((file) => ({
            url: `${req.protocol}://${req.get("host")}/${file.path}`,
            mimetype: file.mimetype,
            size: file.size,
        }));
    }

    const updatedTask = await Task.findByIdAndUpdate(
        taskId,
        {
          $set: {
            title,
            description,
            project,
            assignedTo,
            status,
          },
          $push: {
            attachments: { $each: newAttachments }
          }
        },
        { new: true }
      );

      if (!updatedTask) {
        throw new ApiError(500, "Failed to update task please try again");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTask, "task updated successfully"));

});

// delete task
const deleteTask = asyncHandler(async (req, res) => {
    // delete task
    const {taskId} = req.params

    if(!isValidObjectId(taskId)){
        throw new ApiError(400,"Invalid taskId")
    }


    const task = await Task.findById(taskId)

    if(!task){
        throw new ApiError(404,"Task not found")
    }

    if (
        ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(
            req.user.role,
        )
    ) {
        throw new ApiError(403, "You do not have permission to create tasks.");
    }

    await Task.findByIdAndDelete(taskId);

    //delete subtask
    await SubTask.deleteMany({
        task:taskId
    })

    return res
    .status(200)
    .json(200,{},"Task deleted successfully")



});

// create subtask
const createSubTask = asyncHandler(async (req, res) => {
    // create subtask
    const { title, task } = req.body;

  // Validate required fields
  if (!title || !task) {
    throw new ApiError(400,"Title and task ID are required.")
  }

  const existingTask = await Task.findById(task);
  if (!existingTask) {
    throw new ApiError(404,"Parent task not found.")
  }

  const subtask = await SubTask.create({
    title,
    task,
    createdBy: req.user._id
  });

  return res
  .status(201)
  .json(201,subtask,"Subtask created successfully")

});

// update subtask
const updateSubTask = asyncHandler(async (req, res) => {
    // update subtask
    const { subtaskId } = req.params;
  const { title, isCompleted } = req.body;

  const subtask = await SubTask.findById(subtaskId);
  if (!subtask) {
    throw new ApiError(404,"Subtask not found")
  }

  const updateSubTask = await SubTask.findByIdAndUpdate(subtaskId,{
    $set:{
        title,
        isCompleted
    }
  },{new:true})

  if (!updateSubTask) {
    throw new ApiError(500, "Failed to edit SubTask please try again");
}

return res
    .status(200)
    .json(new ApiResponse(200, newTweet, "SubTask updated successfully"));

});

// delete subtask
const deleteSubTask = asyncHandler(async (req, res) => {
    // delete subtask
    const {subtaskId} = req.params
    const subtask = await SubTask.findById(subtaskId);
  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  if (
    ![UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(
        req.user.role,
    )
) {
    throw new ApiError(403, "You do not have permission to create tasks.");
}

  await subtask.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Subtask deleted successfully"));

});

export {
    createSubTask,
    createTask,
    deleteSubTask,
    deleteTask,
    getTaskById,
    getTasks,
    updateSubTask,
    updateTask,
};
