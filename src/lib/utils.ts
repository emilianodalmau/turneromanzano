import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateReadableId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  let result = '';
  
  // Create a template array of 'c' for char and 'n' for number
  const template = ['c', 'c', 'c', 'c', 'n', 'n', 'n', 'n'];
  
  // Shuffle the template array to mix characters and numbers
  for (let i = template.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [template[i], template[j]] = [template[j], template[i]];
  }
  
  // Build the ID based on the shuffled template
  for(const type of template) {
    if (type === 'c') {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    } else {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
  }

  // Add a dash for readability, e.g., aB3x-8fG1
  return result.slice(0, 4) + '-' + result.slice(4);
}
