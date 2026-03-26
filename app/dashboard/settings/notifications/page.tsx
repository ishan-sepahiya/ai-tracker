import { getNotificationPrefs } from "@/lib/actions/settings";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const prefs = await getNotificationPrefs();
  return (
    <NotificationsClient
      emailEnabled={prefs.emailEnabled}
      alertThresholdPct={prefs.alertThresholdPct}
    />
  );
}

