import logger from "../config/logger";
import { Request, Response } from "express";
import {
  createSchemaLibrary,
  getSchemaLibraryById,
  getSchemaLibrariesByInstructor,
  updateSchemaLibrary,
  deleteSchemaLibrary,
} from "../models/SchemaLibraryModel";
import { SchemaLibraryCreationData } from "../types";

export const createSchemaLibraryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "createSchemaLibraryController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized: Instructor not identified" });
      return;
    }

    const data: SchemaLibraryCreationData = {
      instructorId: req.user.role_id,
      name: req.body.name,
      description: req.body.description,
      setupSql: req.body.setupSql,
    };

    if (!data.name || !data.setupSql) {
      res.status(400).json({ success: false, message: "name and setupSql are required" });
      return;
    }

    const schemaLibrary = await createSchemaLibrary(data);
    res.status(201).json({ success: true, data: schemaLibrary });
  } catch (error) {
    logger.error({ fn, error }, `Error creating schema library: ${error}`);
    res.status(500).json({ success: false, message: "Failed to create schema library" });
  }
};

export const getSchemaLibrariesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getSchemaLibrariesController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized: Instructor not identified" });
      return;
    }
    const schemaLibraries = await getSchemaLibrariesByInstructor(req.user.role_id);
    res.status(200).json({ success: true, data: schemaLibraries });
  } catch (error) {
    logger.error({ fn, error }, `Error fetching schema libraries: ${error}`);
    res.status(500).json({ success: false, message: "Failed to fetch schema libraries" });
  }
};

export const getSchemaLibraryByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getSchemaLibraryByIdController";
  try {
    const schemaLibraryId = Number(req.params.schemaLibraryId);
    const schemaLibrary = await getSchemaLibraryById(schemaLibraryId);
    if (!schemaLibrary) {
      res.status(404).json({ success: false, message: "Schema library not found" });
      return;
    }

    if (!req.user || schemaLibrary.instructorId !== req.user.role_id) {
      res.status(403).json({ success: false, message: "Forbidden: not the owner of this schema library" });
      return;
    }

    res.status(200).json({ success: true, data: schemaLibrary });
  } catch (error) {
    logger.error({ fn, error }, `Error fetching schema library: ${error}`);
    res.status(500).json({ success: false, message: "Failed to fetch schema library" });
  }
};

export const updateSchemaLibraryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "updateSchemaLibraryController";
  try {
    const schemaLibraryId = Number(req.params.schemaLibraryId);
    const existing = await getSchemaLibraryById(schemaLibraryId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Schema library not found" });
      return;
    }

    if (!req.user || existing.instructorId !== req.user.role_id) {
      res.status(403).json({ success: false, message: "Forbidden: not the owner of this schema library" });
      return;
    }

    const data: SchemaLibraryCreationData = {
      instructorId: existing.instructorId,
      name: req.body.name,
      description: req.body.description,
      setupSql: req.body.setupSql,
    };

    const updated = await updateSchemaLibrary(schemaLibraryId, data);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error({ fn, error }, `Error updating schema library: ${error}`);
    res.status(500).json({ success: false, message: "Failed to update schema library" });
  }
};

export const deleteSchemaLibraryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "deleteSchemaLibraryController";
  try {
    const schemaLibraryId = Number(req.params.schemaLibraryId);
    const existing = await getSchemaLibraryById(schemaLibraryId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Schema library not found" });
      return;
    }

    if (!req.user || existing.instructorId !== req.user.role_id) {
      res.status(403).json({ success: false, message: "Forbidden: not the owner of this schema library" });
      return;
    }

    await deleteSchemaLibrary(schemaLibraryId);
    res.status(200).json({ success: true, message: "Schema library deleted successfully" });
  } catch (error) {
    logger.error({ fn, error }, `Error deleting schema library: ${error}`);
    res.status(500).json({ success: false, message: "Failed to delete schema library" });
  }
};
