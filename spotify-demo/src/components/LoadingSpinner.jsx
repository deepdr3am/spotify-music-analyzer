export const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="relative w-full h-full">
        <div className="absolute inset-0 border-4 border-gray-600 rounded-full opacity-30"></div>
        <div className="absolute inset-0 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export const PulseLoader = ({ className = "" }) => (
  <div className={`flex space-x-2 ${className}`}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
        style={{ animationDelay: `${i * 200}ms` }}
      ></div>
    ))}
  </div>
);
