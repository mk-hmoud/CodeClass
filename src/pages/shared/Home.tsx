import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Book, Code, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a] text-white">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center relative">
        <div className="absolute top-20 left-[25%] text-gray-700 opacity-30 text-7xl">{`{`}</div>
        <div className="absolute bottom-40 right-[25%] text-gray-700 opacity-30 text-7xl">{`}`}</div>
        <div className="absolute top-40 right-[10%] text-gray-700 opacity-20 text-7xl">{`//`}</div>

        <div className="bg-[#123651] rounded-full p-6 mb-8">
          <div className="text-[#00b7ff] text-4xl font-mono">{`<>`}</div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold max-w-3xl mb-4">
          <span className="text-[#00b7ff]">Level Up Your Code</span>
          <br />
          <span className="text-white">through challenge</span>
        </h1>

        <p className="text-gray-400 max-w-2xl mb-12 text-lg">
          Improve your development skills by creating and solving code
          challenges.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 bg-[#00b7ff] text-black font-medium py-3 px-6 rounded-md hover:bg-[#00a7ea] transition-colors"
          >
            Explore Challenges <ArrowRight size={20} />
          </Link>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 bg-transparent border border-gray-600 text-white font-medium py-3 px-6 rounded-md hover:bg-gray-800 transition-colors"
          >
            Create Assignments <Plus size={20} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 pb-20">
        <div className="bg-[#0d1224] border border-gray-700 rounded-lg p-8 flex flex-col items-center">
          <div className="bg-[#0e2335] p-4 rounded-lg mb-6">
            <Book className="text-[#00b7ff]" size={28} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-center">
            Browse Assignments
          </h3>
          <p className="text-gray-400 text-center mb-6">
            Discover coding challenges across various difficulty levels and
            topics.
          </p>
          <Link
            to="/login"
            className="text-[#00b7ff] flex items-center hover:underline"
          >
            View assignments <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>

        <div className="bg-[#0d1224] border border-gray-700 rounded-lg p-8 flex flex-col items-center">
          <div className="bg-[#0e2335] p-4 rounded-lg mb-6">
            <Code className="text-[#00b7ff]" size={28} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-center">
            Solve Challenges
          </h3>
          <p className="text-gray-400 text-center mb-6">
            Practice your coding skills in our integrated development
            environment.
          </p>
          <Link
            to="/login"
            className="text-[#00b7ff] flex items-center hover:underline"
          >
            Start coding <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>

        <div className="bg-[#0d1224] border border-gray-700 rounded-lg p-8 flex flex-col items-center">
          <div className="bg-[#0e2335] p-4 rounded-lg mb-6">
            <Plus className="text-[#00b7ff]" size={28} />
          </div>
          <h3 className="text-xl font-bold mb-3 text-center">
            Create Assignments
          </h3>
          <p className="text-gray-400 text-center mb-6">
            Design your own coding challenges with custom test cases and
            descriptions.
          </p>
          <Link
            to="/login"
            className="text-[#00b7ff] flex items-center hover:underline"
          >
            Create now <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
