import { format, formatDistanceToNow, isToday, isYesterday, isThisYear } from 'date-fns';

export const formatEmailDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }
  
  return format(date, 'MMM d, yyyy');
};

export const formatDetailedDate = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, 'MMM d, yyyy, h:mm a');
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
};

export const truncateString = (text: string, maxLength: number = 60): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
};

export const decodeMessageSubject = (encodedSubject: string): string => {
  // Check if the subject is encoded with UTF-8
  if (encodedSubject.startsWith('=?UTF-8?')) {
    try {
      // This is a simplistic approach - in a real app you'd use a proper MIME decoder
      // For now, just extract the text and decode it
      const match = encodedSubject.match(/=\?UTF-8\?.\?(.*?)\?=/);
      if (match && match[1]) {
        return decodeURIComponent(match[1].replace(/=([0-9A-F]{2})/g, '%$1'));
      }
    } catch (e) {
      console.error('Error decoding subject:', e);
    }
  }
  
  return encodedSubject;
};

export const getInitials = (name: string): string => {
  if (!name) return '';
  
  const nameParts = name.split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  
  return (
    nameParts[0].charAt(0).toUpperCase() + 
    nameParts[nameParts.length - 1].charAt(0).toUpperCase()
  );
};

export const generateAvatarColor = (email: string): string => {
  // Generate a consistent color based on email string
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-red-500', 
    'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-indigo-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};