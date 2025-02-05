import React, { useState, useEffect } from 'react';

const ProgressLine = ({ progress = 50 }) => {
  const [particles, setParticles] = useState([]);

  // Generate new particles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newParticle = {
        id: Math.random(),
        left: Math.random() * 20 + 50, // Spread particles around 50% mark
        opacity: 1
      };

      setParticles(prev => [...prev, newParticle]);

      // Clean up old particles
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== newParticle.id));
      }, 1000);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-full p-8">
      {/* Conditionally render message if progress is not 100 */}
      {progress !== 100 && (
        <div className="text-gray-500 text-sm mb-2">Complete your profile</div>
      )}

      <div className="relative">
        {/* Container - made thinner */}
        <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
          {/* Progress bar - width controlled by `progress` prop */}
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${progress}%`, // Dynamically set width based on progress
              boxShadow: '0 0 4px rgba(147, 51, 234, 0.3)'
            }}
          />
        </div>

        {/* Glowing particles */}
        {particles.map(particle => (
          <div 
            key={particle.id}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-purple-400"
            style={{
              left: `${particle.left}%`,
              opacity: particle.opacity,
              transform: 'translateY(-50%) scale(0.5)',
              transition: 'all 1s ease-out',
              animation: 'float-away 1s ease-out forwards',
              color: 'white'
            }}
          />
        ))}
      </div>

      {/* Keyframe animation for particles */}
      <style>{`
        @keyframes float-away {
          0% {
            opacity: 0.8;
            transform: translateY(-50%) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: translateY(-50%) translate(20px, -10px) scale(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressLine;
