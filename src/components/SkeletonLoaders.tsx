import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 p-5 rounded-2xl shadow-sm animate-pulse">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="h-4 bg-stone-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-stone-300 rounded w-32"></div>
      </div>
      <div className="w-10 h-10 bg-stone-200 rounded-xl"></div>
    </div>
    <div className="flex items-center gap-2 mt-3">
      <div className="h-5 bg-stone-200 rounded w-16"></div>
      <div className="h-4 bg-stone-200 rounded w-20"></div>
    </div>
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm animate-pulse">
    <div className="h-5 bg-stone-200 rounded w-48 mb-2"></div>
    <div className="h-3 bg-stone-200 rounded w-64 mb-4"></div>
    <div className="h-64 bg-stone-100 rounded"></div>
  </div>
);

export const SkeletonTable: React.FC = () => (
  <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm animate-pulse">
    <div className="h-5 bg-stone-200 rounded w-40 mb-4"></div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-4 bg-stone-100 rounded flex-1"></div>
          <div className="h-4 bg-stone-100 rounded w-24"></div>
          <div className="h-4 bg-stone-100 rounded w-20"></div>
        </div>
      ))}
    </div>
  </div>
);
