import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/shared/Home";
import Login from "./pages/shared/Login";
import Signup from "./pages/shared/Signup";
import NotFound from "./pages/shared/NotFound";
import Profile from "./pages/shared/Profile";

import InstructorLayout from "./layouts/InstructorLayout";
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import InstructorClassroom from "./pages/instructor/InstructorClassroom";
import ClassroomAnalytics from "./pages/instructor/ClassroomAnalytics";
import InstructorAssignment from "./pages/instructor/InstructorAssignment";
import AssignmentAnalytics from "./pages/instructor/AssignmentAnalytics";
import ProblemCreation from "./pages/instructor/ProblemCreation";
import AssignmentCreation from "./pages/instructor/AssignmentCreation";
import LiveQuizCreator from "./pages/instructor/QuizCreation";

import StudentLayout from "./layouts/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentClassroom from "./pages/student/StudentClassroom";
import StudentAssignment from "./pages/student/StudentAssignment";
import CodeEditor from "@/pages/student/CodeEditorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Shared Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />

          {/* Instructor Routes */}
          <Route path="/instructor" element={<InstructorLayout />}>
            <Route path="dashboard" element={<InstructorDashboard />} />
            <Route path="classrooms/:classroomId">
              <Route path="view" element={<InstructorClassroom />} />
              <Route path="assignments">
                <Route path="create" element={<AssignmentCreation />} />
                <Route path=":assignmentId">
                  <Route path="view" element={<InstructorAssignment />} />
                  <Route path="analytics" element={<AssignmentAnalytics />} />
                </Route>
              </Route>
              <Route path="quizes">
                <Route path="create" element={<LiveQuizCreator />} />
              </Route>
              <Route path="analytics" element={<ClassroomAnalytics />} />
            </Route>
            <Route path="problems">
              <Route path="create" element={<ProblemCreation />} />
            </Route>
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="classrooms/:classroomId">
              <Route path="view" element={<StudentClassroom />} />
              <Route path="assignments/:assignmentId">
                <Route path="view" element={<StudentAssignment />} />
              </Route>
            </Route>
          </Route>

          <Route
            path="/student/classrooms/:classroomId/assignments/:assignmentId/solve"
            element={<CodeEditor />}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
