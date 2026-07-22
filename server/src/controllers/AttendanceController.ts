import logger from '../config/logger';

import { Request, Response } from "express";
import {
  findOrCreateSession,
  getSessionById,
  saveAttendance,
  listSessions,
  getAttendanceReport,
} from "../models/AttendanceModel";
import { getClassroomInstructorId } from "../models/GroupModel";
import { LabAttendanceRecord } from "../types";

const verifyClassroomOwnership = async (
  classroomId: number,
  instructorId: number | undefined
): Promise<boolean> => {
  if (!instructorId) return false;
  const ownerId = await getClassroomInstructorId(classroomId);
  return ownerId === instructorId;
};

export const findOrCreateSessionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "findOrCreateSessionController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const classroomId = Number(req.body.classroomId);
    const groupId = req.body.groupId ? Number(req.body.groupId) : null;
    const sessionDate = req.body.sessionDate;

    if (!classroomId || !sessionDate) {
      res.status(400).json({
        success: false,
        message: "classroomId and sessionDate are required",
      });
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

    const session = await findOrCreateSession(classroomId, groupId, sessionDate);
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    logger.error({ fn, error }, `Error finding/creating session: ${error}`);
    res.status(500).json({ success: false, message: "Failed to load session" });
  }
};

export const saveAttendanceController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "saveAttendanceController";
  try {
    const sessionId = Number(req.params.sessionId);
    const session = await getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    const isOwner = await verifyClassroomOwnership(session.classroomId, req.user?.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    const records: LabAttendanceRecord[] = Array.isArray(req.body.records)
      ? req.body.records
      : [];

    await saveAttendance(sessionId, records);
    res.status(200).json({ success: true, message: "Attendance saved successfully" });
  } catch (error) {
    logger.error({ fn, error }, `Error saving attendance: ${error}`);
    res.status(500).json({ success: false, message: "Failed to save attendance" });
  }
};

export const listSessionsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "listSessionsController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const classroomId = Number(req.params.classroomId);
    const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;

    const isOwner = await verifyClassroomOwnership(classroomId, req.user.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    const sessions = await listSessions(classroomId, groupId);
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    logger.error({ fn, error }, `Error listing sessions: ${error}`);
    res.status(500).json({ success: false, message: "Failed to list sessions" });
  }
};

export const getAttendanceReportController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fn = "getAttendanceReportController";
  try {
    if (!req.user || !req.user.role_id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const assignmentId = Number(req.params.assignmentId);
    const sessionId = Number(req.query.sessionId);
    if (!sessionId) {
      res.status(400).json({ success: false, message: "sessionId is required" });
      return;
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    const isOwner = await verifyClassroomOwnership(session.classroomId, req.user.role_id);
    if (!isOwner) {
      res.status(403).json({
        success: false,
        message: "Forbidden: not the owner of this classroom",
      });
      return;
    }

    const report = await getAttendanceReport(assignmentId, sessionId);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    logger.error({ fn, error }, `Error building attendance report: ${error}`);
    res.status(500).json({ success: false, message: "Failed to build report" });
  }
};
