import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth, normalizeRoles } from './AuthContext';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [globalResults, setGlobalResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();

  const userRoles = useMemo(() => normalizeRoles(user?.roles), [user?.roles]);
  const isAdmin = userRoles.includes('ADMIN');

  // Reset search when navigating between pages
  React.useEffect(() => {
    setSearchQuery('');
    setGlobalResults([]);
  }, [location.pathname]);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const performGlobalSearch = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setGlobalResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get('/search', { params: { q: query } });
      const data = response.data;

      // Merge and format results from all categories
      const formattedResults = [
        ...(data.facilities || []).map(f => ({ ...f, type: 'Resource', title: f.title || f.name })),
        ...(data.tickets || []).map(t => ({ ...t, type: 'Ticket' })),
        ...(data.bookings || []).map(b => ({ ...b, type: 'Booking' })),
        ...(data.notifications || []).map(n => ({ ...n, type: 'Notification' })),
        ...(data.users || []).map(u => ({ ...u, type: u.category })),
        ...(data.announcements || []).map(a => ({ ...a, type: 'Announcement' })),
        ...(data.lectures || []).map(l => ({ ...l, type: 'Lecture' })),
      ];

      // Frontend Safeguard: Filter results based on role and ownership
      const finalResults = formattedResults.filter(item => {
        if (isAdmin) return true;
        if (item.type === 'Resource') return true; // Facilities are public
        if (item.type === 'Announcement') return true; // Backend filters visibility
        if (item.type === 'Lecture') return true; // Backend filters visibility
        
        // Strict ownership check (ownerId is set to authorized user ID in backend)
        return item.ownerId === user?.id;
      });

      setGlobalResults(finalResults);
    } catch (error) {
      console.error('Global search failed:', error);
      setGlobalResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [isAdmin, user?.id]);

  const value = useMemo(() => ({
    searchQuery,
    setSearchQuery: handleSearchChange,
    globalResults,
    setGlobalResults,
    isSearching,
    performGlobalSearch
  }), [searchQuery, handleSearchChange, globalResults, isSearching, performGlobalSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
