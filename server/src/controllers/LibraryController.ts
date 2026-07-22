import logger from '../config/logger';

import { Request, Response } from "express";
import {
  createLibrary,
  getLibraryById,
  getLibrariesByInstructor,
  updateLibrary,
  deleteLibrary,
} from "../models/LibraryModel";
import { LibraryCreationData } from "../types";

export const createLibraryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "createLibraryController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Instructor not identified",
      });
      return;
    }

    const libraryData: LibraryCreationData = {
      instructorId: req.user.role_id,
      name: req.body.name,
      description: req.body.description,
      files: req.body.files || [],
    };

    const result = await createLibrary(libraryData);
    logger.info(
      { fn, libraryId: result.libraryId },
      `Library created with ID: ${result.libraryId}`
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error({ fn, error }, `Error creating library: ${error}`);
    res
      .status(500)
      .json({ success: false, message: "Failed to create library" });
  }
};

export const getLibrariesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getLibrariesController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Instructor not identified",
      });
      return;
    }
    const instructorId = req.user.role_id;
    const libraries = await getLibrariesByInstructor(instructorId);

    res.status(200).json({ success: true, data: libraries });
  } catch (error) {
    logger.error({ fn, error }, `Error fetching libraries: ${error}`);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch libraries" });
  }
};

export const getLibraryByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getLibraryByIdController";
  try {
    const libraryId = Number(req.params.libraryId);
    const library = await getLibraryById(libraryId);
    if (!library) {
      res.status(404).json({ success: false, message: "Library not found" });
      return;
    }

    if (!req.user || library.instructorId !== req.user.role_id) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this library",
      });
      return;
    }

    res.status(200).json({ success: true, data: library });
  } catch (error) {
    logger.error({ fn, error }, `Error fetching library: ${error}`);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch library" });
  }
};

export const updateLibraryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "updateLibraryController";
  try {
    const libraryId = Number(req.params.libraryId);
    const existing = await getLibraryById(libraryId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Library not found" });
      return;
    }

    if (!req.user || existing.instructorId !== req.user.role_id) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this library",
      });
      return;
    }

    const libraryData: LibraryCreationData = {
      instructorId: existing.instructorId,
      name: req.body.name,
      description: req.body.description,
      files: req.body.files || [],
    };

    const updatedLibrary = await updateLibrary(libraryId, libraryData);
    res.status(200).json({ success: true, data: updatedLibrary });
  } catch (error) {
    logger.error({ fn, error }, `Error updating library: ${error}`);
    res
      .status(500)
      .json({ success: false, message: "Failed to update library" });
  }
};

export const deleteLibraryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "deleteLibraryController";
  try {
    const libraryId = Number(req.params.libraryId);
    const existing = await getLibraryById(libraryId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Library not found" });
      return;
    }

    if (!req.user || existing.instructorId !== req.user.role_id) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this library",
      });
      return;
    }

    await deleteLibrary(libraryId);
    res
      .status(200)
      .json({ success: true, message: "Library deleted successfully" });
  } catch (error) {
    logger.error({ fn, error }, `Error deleting library: ${error}`);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete library" });
  }
};
