import { Brackets } from "lucide-react";

const Logo = ({}: {}) => {
  return (
    <div className="flex items-center gap-2">
      <Brackets className="text-primary h-8 w-8" />
      <span className="font-mono font-bold text-2xl">CodeClass</span>
    </div>
  );
};

export default Logo;
