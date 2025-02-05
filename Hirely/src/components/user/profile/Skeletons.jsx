import React from 'react';

export const SkeletonPulse = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="bg-black rounded-2xl p-8 mb-8 animate-pulse">
    <div className="flex flex-col md:flex-row gap-8">
      <div className="flex-shrink-0">
        <div className="w-32 h-32 bg-gray-700 rounded-full"></div>
      </div>
      <div className="flex-grow">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-5 bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const ExperienceSkeleton = () => (
  <div className="bg-black rounded-2xl p-6 animate-pulse">
    <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
    {[1, 2].map((i) => (
      <div key={i} className="border-b border-gray-800 last:border-0 pb-8 last:pb-0 mb-8">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/5 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkillsSkeleton = () => (
  <div className="bg-black rounded-2xl p-6 animate-pulse">
    <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-8 bg-gray-700 rounded"></div>
      ))}
    </div>
  </div>
);

export const EducationSkeleton = () => (
  <div className="bg-black rounded-2xl p-6 animate-pulse">
    <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
    {[1, 2].map((i) => (
      <div key={i} className="mb-6 last:mb-0">
        <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
      </div>
    ))}
  </div>
);

export const CertificationsSkeleton = () => (
  <div className="bg-black rounded-2xl p-6 animate-pulse">
    <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
    {[1, 2].map((i) => (
      <div key={i} className="mb-6 last:mb-0">
        <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
      </div>
    ))}
  </div>
);

export const ProjectsSkeleton = () => (
  <div className="bg-black rounded-2xl p-6 animate-pulse">
    <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 border border-gray-800 rounded-xl">
          <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  </div>
);