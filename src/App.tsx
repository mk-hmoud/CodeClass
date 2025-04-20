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
import InstructorAssignment from "./pages/instructor/InstructorAssignment";
import ProblemCreation from "./pages/instructor/ProblemCreation";
import AssignmentCreation from "./pages/instructor/AssignmentCreation";

import StudentLayout from "./layouts/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentClassroom from "./pages/student/StudentClassroom";
import StudentAssignment from "./pages/student/StudentAssignment";

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
              <Route
                path="view"
                element={<InstructorClassroom />}
              />
              <Route path="assignments">
                <Route path="create" element={<AssignmentCreation />} />
                <Route
                  path=":assignmentId"
                  element={<InstructorAssignment />}
                />
              </Route>
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
              <Route path="assignments/:assignmentId" element={<StudentAssignment />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
