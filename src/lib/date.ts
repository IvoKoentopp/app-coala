import { format, parse } from 'date-fns';

export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  // Se a data já for um objeto Date, use diretamente
  if (date instanceof Date) {
    return format(date, 'dd/MM/yyyy');
  }
  
  // Para string, primeiro parse para Date mantendo a data exata
  const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
  return format(parsedDate, 'dd/MM/yyyy');
}

export function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr; // Return the date string as is (yyyy-MM-dd)
}