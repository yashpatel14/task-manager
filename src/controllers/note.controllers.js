import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ProjectNote } from "../models/note.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getNotes = asyncHandler(async(req,res)=>{
    // get all notes
    const {projectId} = req.params;
    if(!isValidObjectId(projectId)){
        throw new ApiError(400,"Invalid projectId")
    }
    const note = await ProjectNote.aggregate([
        {
            $match:{
                project:new mongoose.Types.ObjectId(projectId)
            }
        },
        {
            $lookup: {
              from: "projects",
              localField: "project",
              foreignField: "_id",
              as: "project",
            },
          },
          { $unwind: "$project" },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "createdBy",
            },
          },
          { $unwind: "$createdBy" },
          { $sort: { createdAt: -1 } },
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,note,"note list fetch successfully"))
  });
  
  const getNoteById = asyncHandler(async(req,res)=>{
    // get note by id
    const {noteId} = req.params;

    if(!isValidObjectId(noteId)){
        throw new ApiError(400,"Invalid noteId")
    }

    const note = await ProjectNote.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(noteId) } },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        { $unwind: "$project" },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        { $unwind: "$createdBy" },
      ]);

      return res
      .status(200)
      .json(new ApiResponse(200,note,"note fetch successfully"))

  });
  
  const createNote = asyncHandler(async(req,res)=>{
    // create note
    const {project,content} = req.body

    if(!project && !content){
        throw new ApiError(400,"project and content is required")
    }

    const createNote = await ProjectNote.create({
        project,
        content,
        createdBy:req.user?._id
    })

    const note = await ProjectNote.findById(createNote._id);

    if (!note) {
        throw new ApiError(500, "project note create failed please try again !!!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, createNote, "note created successfully"));

  });
  
  const updateNote = asyncHandler(async(req,res)=>{
    // update note
    const {noteId} = req.params;
    const {content} = req.body;
    if(!isValidObjectId(noteId)){
        throw new ApiError(400,"Invalid noteId")
    }

    if(!content){
        throw new ApiError(400,"content is required")
    }

    const updateNote = await ProjectNote.findByIdAndUpdate(noteId,{
        $set:{
            content
        }
    },{new:true})

    if (!updateNote) {
        throw new ApiError(500, "Failed to update note please try again");
    }


    return res
        .status(200)
        .json(new ApiResponse(200, updateNote, "note updated successfully"));
  });
  
  const deleteNote = asyncHandler(async(req,res)=>{
    // delete note
    const {noteId} = req.params;
    if(!isValidObjectId(noteId)){
        throw new ApiError(400,"Invalid noteId");
    }

    const note = await ProjectNote.findById(noteId);

    if (!note) {
        throw new ApiError(404, "No note found");
    }

    const noteDeleted = await ProjectNote.findByIdAndDelete(note?._id);

    if (!noteDeleted) {
        throw new ApiError(400, "Failed to delete the note please try again");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "note deleted successfully"));

  });
  
  export { createNote, deleteNote, getNoteById, getNotes, updateNote };
  