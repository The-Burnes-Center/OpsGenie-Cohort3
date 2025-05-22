import * as React from "react";
import { createContext, useState, useContext } from "react";
import { v4 as uuidv4 } from 'uuid';  // Import the UUID function
import { FlashbarProps } from "@cloudscape-design/components";

interface NotificationContextType {
  notifications: any[];
  addNotification: (type: string, content: string) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Create a context for the notification manager
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => { return ""; },
  removeNotification: () => {},
  clearNotifications: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [announcement, setAnnouncement] = useState('');
  
  // Add function to set announcements for screen readers
  const announce = (message: string) => {
    setAnnouncement(message);
  };
  
  const addNotification = (type: string, content: string) => {
    const id = uuidv4();  // Generate a UUID for each new notification
    // type: "info" | "success" | "warning" | "error"

    setNotifications(prev => [...prev, {
      id: id,
      type: type as FlashbarProps.Type,
      content: content,
      date: new Date().getTime(),
      dismissible: true,
      dismissLabel: "Hide notification",
      onDismiss: () => removeNotification(id)
    }]);  
    // Automatically remove the notification after 5 seconds
    setTimeout(() => removeNotification(id), 5000);  
    
    console.log("Added notification", id);
    
    // Also announce important notifications to screen readers
    if (type === 'error' || type === 'warning') {
      announce(`${type}: ${content}`);
    }
    
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => {
      const updatedNotifications = prev.filter(notif => notif.id !== id);
      console.log("Removing notification", id);
      console.log("Updated notifications", updatedNotifications);
      return updatedNotifications;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearNotifications }}>
      {children}
      <div aria-live="assertive" className="sr-only" style={{ position: 'absolute', height: 1, width: 1, overflow: 'hidden' }}>
        {announcement}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
