import logger from '../config/logger';

import { Request, Response } from "express";
import {
  createGroup,
  getGroupById,
  getGroupsByClassroom,
  updateGroup,
  deleteGroup,
  setGroupRoster,
  importGroupRosters,
  getClassroomInstructorId,
} from "../models/GroupModel";
import { LabGroupCreationData } from "../types";

const verifyClassroomOwnership = async (
  classroomId: number,
  instructorId: number | undefined
): Promise<boolean> => {
  if (!instructorId) return false;
  const ownerId = await getClassroomInstructorId(classroomId);
  return ownerId === instructorId;
};

export const createGroupController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "createGroupController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const classroomId = Number(req.body.classroomId);
    const isOwner = await verifyClassroomOwnership(classroomId, req.user.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    const groupData: LabGroupCreationData = {
      classroomId,
      name: req.body.name,
      dayOfWeek: req.body.dayOfWeek,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
    };

    const result = await createGroup(groupData);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error({ fn, error }, `Error creating group: ${error}`);
    res.status(500).json({ success: false, message: "Failed to create group" });
  }
};

export const getGroupsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getGroupsController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const classroomId = Number(req.query.classroomId);
    if (!classroomId) {
      res.status(400).json({ success: false, message: "classroomId is required" });
      return;
    }

    const isOwner = await verifyClassroomOwnership(classroomId, req.user.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    const groups = await getGroupsByClassroom(classroomId);
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    logger.error({ fn, error }, `Error fetching groups: ${error}`);
    res.status(500).json({ success: false, message: "Failed to fetch groups" });
  }
};

export const updateGroupController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "updateGroupController";
  try {
    const groupId = Number(req.params.groupId);
    const existing = await getGroupById(groupId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Group not found" });
      return;
    }

    const isOwner = await verifyClassroomOwnership(existing.classroomId, req.user?.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    const groupData: LabGroupCreationData = {
      classroomId: existing.classroomId,
      name: req.body.name,
      dayOfWeek: req.body.dayOfWeek,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
    };

    await updateGroup(groupId, groupData);
    res.status(200).json({ success: true, message: "Group updated successfully" });
  } catch (error) {
    logger.error({ fn, error }, `Error updating group: ${error}`);
    res.status(500).json({ success: false, message: "Failed to update group" });
  }
};

export const deleteGroupController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "deleteGroupController";
  try {
    const groupId = Number(req.params.groupId);
    const existing = await getGroupById(groupId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Group not found" });
      return;
    }

    const isOwner = await verifyClassroomOwnership(existing.classroomId, req.user?.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    await deleteGroup(groupId);
    res.status(200).json({ success: true, message: "Group deleted successfully" });
  } catch (error) {
    logger.error({ fn, error }, `Error deleting group: ${error}`);
    res.status(500).json({ success: false, message: "Failed to delete group" });
  }
};

export const setGroupRosterController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "setGroupRosterController";
  try {
    const groupId = Number(req.params.groupId);
    const existing = await getGroupById(groupId);
    if (!existing) {
      res.status(404).json({ success: false, message: "Group not found" });
      return;
    }

    const isOwner = await verifyClassroomOwnership(existing.classroomId, req.user?.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    const studentIds: number[] = Array.isArray(req.body.studentIds)
      ? req.body.studentIds.map(Number)
      : [];

    await setGroupRoster(groupId, existing.classroomId, studentIds);
    res.status(200).json({ success: true, message: "Roster updated successfully" });
  } catch (error) {
    logger.error({ fn, error }, `Error setting group roster: ${error}`);
    res.status(500).json({ success: false, message: "Failed to set roster" });
  }
};

export const importGroupRostersController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "importGroupRostersController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const classroomId = Number(req.body.classroomId);
    const isOwner = await verifyClassroomOwnership(classroomId, req.user.role_id);
    if (!isOwner) {
      res.status(403).json({ success: false, message: "Forbidden: not the owner of this classroom" });
      return;
    }

    // Normalise and validate the buckets: a positive integer group number and a
    // list of student ids. Malformed entries are dropped rather than 500ing.
    const raw = Array.isArray(req.body.buckets) ? req.body.buckets : [];
    const buckets = raw
      .map((b: any) => ({
        groupNumber: Number(b?.groupNumber),
        studentIds: Array.isArray(b?.studentIds) ? b.studentIds.map(Number).filter(Number.isFinite) : [],
      }))
      .filter((b: { groupNumber: number }) => Number.isInteger(b.groupNumber) && b.groupNumber > 0);

    if (buckets.length === 0) {
      res.status(400).json({ success: false, message: "No valid groups to import" });
      return;
    }

    const result = await importGroupRosters(classroomId, buckets);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error({ fn, error }, `Error importing group rosters: ${error}`);
    res.status(500).json({ success: false, message: "Failed to import group rosters" });
  }
};
