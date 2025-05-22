import {
  Flashbar
} from "@cloudscape-design/components";
// import styles from "../styles/chat.module.scss";
// import "../../styles/app.scss";
import { useNotifications } from "./notif-manager";

export default function NotificationBar() {
  const { notifications } = useNotifications();
  
  return (  
    <div aria-live="polite" aria-atomic="true">
      <Flashbar items={notifications.map(notif => ({
        content: notif.content,
        dismissible: notif.dismissible,
        onDismiss: () => notif.onDismiss(),
        type: notif.type,
        ariaRole: 'alert',
        statusIconAriaLabel: `${notif.type} notification`
      }))} />    
    </div>  
  );
}
