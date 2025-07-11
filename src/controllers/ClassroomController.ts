import { Request, Response } from 'express';
import { 
  createClassroom, 
  getInstructorClassroomById, 
  getStudentClassroomById, 
  getInstructorClassrooms, 
  getStudentClassrooms, 
  assignAssignment, 
  deleteClassroom,
  joinClassroom,
  toggleClassroomStatus
} from '../models/ClassroomModel';
import { getInstructorByUserId, getInstructorIdByClassroom, Instructor } from '../models/InstructorModel';
import { getStudentByUserId, Student } from '../models/StudentModel'; 
import { Classroom } from "../types";

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [ClassroomController.ts] [${functionName}] ${message}\n`);
};

export const createClassroomController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'createClassroomController';
  try {
    logMessage(functionName, 'Received request to create classroom.');

    if (!req.user) {
      logMessage(functionName, "No user information found in request.");
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const instructor: Instructor | null = await getInstructorByUserId(req.user.id);
    if (!instructor) {
      logMessage(functionName, "Unauthorized user, cannot create classroom.");
      res.status(401).json({ success: false, message: 'Unauthorized: Instructor not identified' });
      return;
    }

    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'Classroom name is required' });
      return;
    }
    
    const classroom_code = generateClassroomCode();
    logMessage(functionName, `Generated code for the classroom is ${classroom_code}`);

    const classroomData: Omit<Classroom, 'id' | 'created_at'> = {
      name: name,
      code: classroom_code,
      instructor: String(instructor.instructor_id),
      announcements: [],
      discussions: [],
      active: true,
      completion: 0,
    };

    const result = await createClassroom(classroomData);
    logMessage(functionName, `Classroom created with ID: ${result.id}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logMessage(functionName, `Error creating classroom: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to create classroom' });
  }
};

function generateClassroomCode(length: number = 6): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    code += charset[randomIndex];
  }
  return code;
}

export const getClassroomByIdController = async (req: Request, res: Response): Promise<void> => {
  const functionName = "getClassroomByIdController";
  try {
    const classroomId = Number(req.params.classroomId);
    logMessage(functionName, `Received request for classroom ID: ${classroomId}`);

    if (!req.user) {
      logMessage(functionName, "No user information found in request.");
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    
    const role = req.user.role;
    logMessage(functionName, `User ID ${req.user.id} has role: ${role}`);

    let classroom;
    if (role === "instructor") {
      classroom = await getInstructorClassroomById(classroomId);
    } else if (role === "student") {
      classroom = await getStudentClassroomById(classroomId, req.user.role_id);
    } else {
      throw new Error("Invalid user role");
    }
    logMessage(functionName, `Fetched classroom ID: ${classroomId} successfully`);
    res.status(200).json({ success: true, data: classroom });
  } catch (error) {
    logMessage(functionName, `Error fetching classroom: ${error}`);
    res.status(500).json({ success: false, message: "Failed to fetch classroom" });
  }
};

export const getClassroomsController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'getClassroomsController';
  try {
    logMessage(functionName, 'Received request to fetch classrooms');

    if (!req.user) {
      logMessage(functionName, "No user information found in request.");
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const role = req.user.role;
    logMessage(functionName, `User's role is ${req.user.role} has role id: ${req.user.role_id}`);

    let classrooms: Classroom[] = [];

    if (role === "instructor") {
      classrooms = await getInstructorClassrooms(req.user.role_id!);
      logMessage(functionName, `Fetched ${classrooms.length} instructor classrooms`);
    } else if (role === "student") {
      classrooms = await getStudentClassrooms(req.user.role_id!);
      logMessage(functionName, `Fetched ${classrooms.length} student classrooms`);
    } else {
      logMessage(functionName, `User role ${role} is not recognized for fetching classrooms`);
      res.status(400).json({ success: false, message: 'Invalid user role' });
      return;
    }

    res.status(200).json({ success: true, data: classrooms });
  } catch (error) {
    logMessage(functionName, `Error fetching classrooms: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to fetch classrooms' });
  }
};

export const assignAssignmentController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'assignAssignmentController';
  try {
    const { classroomId, problemId, due_date } = req.body;
    logMessage(functionName, `Received request to assign problem ID ${problemId} to classroom ID ${classroomId}`);
    await assignAssignment(classroomId, problemId, due_date);
    logMessage(functionName, `Problem ID ${problemId} assigned to classroom ID ${classroomId} successfully.`);
    res.status(200).json({ success: true, message: 'Assignment assigned successfully' });
  } catch (error) {
    logMessage(functionName, `Error assigning assignment: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to assign assignment' });
  }
};

export const deleteClassroomController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'deleteClassroomController';
  try {
    const classroomId = Number(req.params.classroomId);
    logMessage(functionName, `Received request to delete classroom ID: ${classroomId}`);
    
    if (!req.user) {
      logMessage(functionName, "No user information found in request.");
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role !== "instructor") {
      res.status(401).json({ success: false, message: 'Unauthorized: User is not an instructor' });
      return;
    }

    const classroom_instructor = await getInstructorIdByClassroom(classroomId);
    if (!classroom_instructor) {
      res.status(404).json({ success: false, message: 'Classroom not found' });
      return;
    }

    if (req.user.role_id !== classroom_instructor) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to delete this classroom' });
      return;
    }

    await deleteClassroom(classroomId);
    logMessage(functionName, `Deleted classroom ID: ${classroomId}`);
    res.status(200).json({ success: true, message: 'Classroom deleted successfully' });
  } catch (error) {
    logMessage(functionName, `Error deleting classroom: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to delete classroom' });
  }
};

export const joinClassroomController = async (req: Request, res: Response): Promise<void> => {
  const functionName = 'joinClassroomController';
  try {
    logMessage(functionName, 'Received request to join classroom.');

    if (!req.user) {
      logMessage(functionName, 'No user in request.');
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const student: Student | null = await getStudentByUserId(req.user.id);
    if (!student) {
      logMessage(functionName, `User ${req.user.id} is not a student.`);
      res.status(401).json({ success: false, message: 'Unauthorized: Not a student' });
      return;
    }

    const { code }  = req.body;
    logMessage(functionName, `Classroom code received is ${code}`);
    if (typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ success: false, message: 'Classroom code is required' });
      return;
    }

    await joinClassroom(req.user.role_id, code.trim().toUpperCase());

    logMessage(functionName, `Student ${student.student_id} joined classroom with code ${code}.`);
    res.status(201).json({ success: true, message: 'Enrolled successfully' });
  } catch (error: any) {
    logMessage(functionName, `Error in joinClassroom: ${error.message}`);
    if (error.message === 'INVALID_CODE') {
      res.status(400).json({ success: false, message: 'Invalid classroom code' });
    } else if (error.message === 'ALREADY_ENROLLED') {
      res.status(409).json({ success: false, message: 'Already enrolled in this classroom' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to join classroom' });
    }
    return;
  }
};

export const toggleClassroomStatusController = async (req: Request, res: Response) => {
  const fn = 'toggleClassroomStatus';
  try {
    const classroomId = Number(req.params.classId);
    logMessage(fn, `Toggling status for classroom ${classroomId}`);
    const newStatus = await toggleClassroomStatus(classroomId);
    logMessage(fn, `Classroom ${classroomId} is now ${newStatus}`);
    res.json({ success: true, data: { classroomId, status: newStatus } });
  } catch (err) {
    logMessage(fn, `Error toggling: ${err}`);
    res.status(500).json({ success: false, message: 'Failed to toggle classroom status' });
  }
};