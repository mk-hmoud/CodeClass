import React from "react";
import { motion } from "framer-motion";
import { Code, Code2, Terminal } from "lucide-react";

const Logo = ({
  size = "default",
}: {
  size?: "small" | "default" | "large";
}) => {
  const sizeClasses = {
    small: "h-8 w-8",
    default: "h-10 w-10",
    large: "h-12 w-12",
  };

  const iconSize = {
    small: 16,
    default: 20,
    large: 24,
  };

  const textSize = {
    small: "text-lg",
    default: "text-xl",
    large: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center`}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="absolute"
        >
          <Code size={iconSize[size]} className="text-white" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ repeat: Infinity, duration: 3, delay: 1.5 }}
          className="absolute"
        >
          <Terminal size={iconSize[size]} className="text-cyan-300" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: [0, 1, 0], rotate: 0 }}
          transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
          className="absolute"
        >
          <Code2 size={iconSize[size]} className="text-white" />
        </motion.div>
      </motion.div>
      <motion.span
        className={`font-bold ${textSize[size]} bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        CodeEd
      </motion.span>
    </div>
  );
};

export default Logo;
