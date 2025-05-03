import React from 'react';
import { getInitials, generateAvatarColor } from '../../utils/formatters';

interface AvatarProps {
  name?: string;
  email: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  name, 
  email, 
  size = 'md',
  className = ''
}) => {
  const initials = name ? getInitials(name) : email.charAt(0).toUpperCase();
  const bgColor = generateAvatarColor(email);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-medium ${className}`}
      title={name || email}
    >
      {initials}
    </div>
  );
};

export default Avatar;