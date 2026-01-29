import Courier from "@trycourier/courier";

const client = new Courier({
  apiKey: process.env.COURIER_API_KEY,
});

interface SMSNotification {
  phoneNumber: string;
  message: string;
}

export async function sendSMS({ phoneNumber, message }: SMSNotification): Promise<{ success: boolean; requestId?: string; error?: string }> {
  if (!process.env.COURIER_API_KEY) {
    console.log("[SMS] Courier API key not configured, skipping notification");
    return { success: false, error: "Courier API key not configured" };
  }

  if (!phoneNumber) {
    console.log("[SMS] No phone number provided, skipping notification");
    return { success: false, error: "No phone number provided" };
  }

  try {
    const response = await client.send.message({
      message: {
        to: {
          phone_number: phoneNumber,
        },
        content: {
          title: "HealthStaff Pro",
          body: message,
        },
        routing: {
          method: "single",
          channels: ["sms"],
        },
      },
    });

    console.log(`[SMS] Notification sent successfully to ${phoneNumber}, requestId: ${response.requestId}`);
    return { success: true, requestId: response.requestId };
  } catch (error) {
    console.error("[SMS] Failed to send notification:", error);
    return { success: false, error: String(error) };
  }
}

export async function notifyWorkerNewShift(
  worker: { phone: string; firstName: string },
  shift: { title: string; facility: string; date: string; rate: string }
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const message = `Hi ${worker.firstName}! A new shift is available: ${shift.title} at ${shift.facility} on ${shift.date}. Rate: ${shift.rate}/hr. Log in to apply!`;
  return sendSMS({ phoneNumber: worker.phone, message });
}

export async function notifyApplicationAccepted(
  worker: { phone: string; firstName: string },
  shift: { title: string; facility: string; date: string }
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const message = `Great news ${worker.firstName}! Your application for ${shift.title} at ${shift.facility} on ${shift.date} has been ACCEPTED. Please confirm your attendance in the app.`;
  return sendSMS({ phoneNumber: worker.phone, message });
}

export async function notifyApplicationRejected(
  worker: { phone: string; firstName: string },
  shift: { title: string; facility: string }
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const message = `Hi ${worker.firstName}, unfortunately your application for ${shift.title} at ${shift.facility} was not selected. Check the app for other available shifts!`;
  return sendSMS({ phoneNumber: worker.phone, message });
}

export async function notifyShiftReminder(
  worker: { phone: string; firstName: string },
  shift: { title: string; facility: string; date: string; startTime: string }
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const message = `Reminder: ${worker.firstName}, you have a shift tomorrow - ${shift.title} at ${shift.facility}. Start time: ${shift.startTime}. Don't forget to check in!`;
  return sendSMS({ phoneNumber: worker.phone, message });
}

export async function notifyShiftCancelled(
  worker: { phone: string; firstName: string },
  shift: { title: string; facility: string; date: string }
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const message = `Hi ${worker.firstName}, the shift ${shift.title} at ${shift.facility} on ${shift.date} has been cancelled. We apologize for the inconvenience.`;
  return sendSMS({ phoneNumber: worker.phone, message });
}

export async function sendBulkNotification(
  workers: Array<{ phone: string; firstName: string }>,
  messageTemplate: (name: string) => string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const worker of workers) {
    if (!worker.phone) {
      failed++;
      continue;
    }

    const result = await sendSMS({
      phoneNumber: worker.phone,
      message: messageTemplate(worker.firstName),
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
