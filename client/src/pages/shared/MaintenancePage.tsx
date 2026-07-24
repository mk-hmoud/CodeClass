import { Wrench, RotateCcw } from "lucide-react";

const MaintenancePage = () => (
  <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
    <div className="text-center max-w-md">
      <div className="flex items-center justify-center gap-2 mb-8 opacity-20">
        <Wrench size={40} className="text-primary" />
      </div>
      <p className="text-sm font-mono text-primary mb-2">Maintenance</p>
      <h1 className="text-4xl font-bold mb-3">Be right back</h1>
      <p className="text-muted-foreground mb-8">
        CodeClass is undergoing scheduled maintenance. Please check back shortly.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <RotateCcw size={15} />
        Try again
      </button>
    </div>
  </div>
);

export default MaintenancePage;
