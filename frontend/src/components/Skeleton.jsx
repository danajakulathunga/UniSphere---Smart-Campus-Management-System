import React from "react";

const Skeleton = ({ className, variant = "rect" }) => {
  const baseClass = "animate-pulse bg-slate-200 dark:bg-white/5";
  
  const variants = {
    rect: "rounded-2xl",
    circle: "rounded-full",
    text: "rounded-lg h-4 w-full",
  };

  return <div className={`${baseClass} ${variants[variant]} ${className}`} />;
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 animate-reveal">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-100 dark:bg-white/5 p-8 sm:p-12 h-[300px]">
        <div className="space-y-4 max-w-xl">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-4 pt-6">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-40" />
          </div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-slate-900/50">
            <Skeleton variant="circle" className="h-12 w-12 mb-6" />
            <Skeleton className="h-6 w-1/2 mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-slate-900/50 h-[400px]">
            <Skeleton className="h-8 w-1/4 mb-8" />
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/5 dark:bg-slate-900/50 h-[400px]">
            <Skeleton className="h-8 w-1/2 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
