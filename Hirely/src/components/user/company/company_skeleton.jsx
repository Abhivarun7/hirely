import React from 'react';

const JobSearchSkeleton = () => {
    const c=1;  // This is a dummy variable to make the code compile
  return (
    <div className="bg-blue-500/5 min-h-screen text-white p-8">
      <div className="container mx-auto">
        <div className="mt-8 space-y-4">
          {/* Generate 3 skeleton items */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (
            <div 
              key={index}
              className="bg-blue-500/10 p-4 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-3 w-full">
                  {/* Job title skeleton */}
                  <div className="h-6 bg-blue-500/20 rounded-md w-1/3 animate-pulse" />
                  
                  {/* Company name and icon skeleton */}
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-blue-500/20 rounded animate-pulse" />
                    <div className="h-4 bg-blue-500/20 rounded w-1/4 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Selected job view skeleton */}
         
        </div>
      </div>
    </div>
  );
};

export default JobSearchSkeleton;