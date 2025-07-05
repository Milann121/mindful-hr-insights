import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DateFilterPeriod = 
  | 'today'
  | 'yesterday'
  | 'week-to-date'
  | 'last-week'
  | 'month-to-date'
  | 'last-month'
  | 'last-30-days'
  | 'year-to-date'
  | 'last-year';

interface DateFilterContextType {
  selectedPeriod: DateFilterPeriod;
  setSelectedPeriod: (period: DateFilterPeriod) => void;
  getDateRange: () => { start: Date; end: Date };
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
};

interface DateFilterProviderProps {
  children: ReactNode;
}

export const DateFilterProvider: React.FC<DateFilterProviderProps> = ({ children }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<DateFilterPeriod>('last-30-days');

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    
    let start = new Date(today);

    switch (selectedPeriod) {
      case 'today':
        start = new Date(today);
        break;
      
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end.setTime(start.getTime());
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'week-to-date':
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay()); // Start of current week (Sunday)
        break;
      
      case 'last-week':
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay() - 7); // Start of last week
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 6); // End of last week
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'month-to-date':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      
      case 'last-month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end.setTime(new Date(today.getFullYear(), today.getMonth(), 0).getTime());
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'last-30-days':
        start = new Date(today);
        start.setDate(start.getDate() - 30);
        break;
      
      case 'year-to-date':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      
      case 'last-year':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end.setTime(new Date(today.getFullYear() - 1, 11, 31).getTime());
        end.setHours(23, 59, 59, 999);
        break;
      
      default:
        start = new Date(today);
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  };

  return (
    <DateFilterContext.Provider value={{
      selectedPeriod,
      setSelectedPeriod,
      getDateRange
    }}>
      {children}
    </DateFilterContext.Provider>
  );
};