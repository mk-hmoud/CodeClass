import { Link } from "react-router-dom";
import { Brackets, ArrowLeft } from "lucide-react";

const NotFound = () => (
  <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
    <div className="text-center max-w-md">
      <div className="flex items-center justify-center gap-2 mb-8 opacity-20">
        <Brackets size={40} className="text-primary" />
      </div>
      <p className="text-sm font-mono text-primary mb-2">404</p>
      <h1 className="text-4xl font-bold mb-3">Page not found</h1>
      <p className="text-muted-foreground mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to home
      </Link>
    </div>
  </div>
);

export default NotFound;
