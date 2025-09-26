export async function createCalendlyInvitee(email: string, name: string, eventType: string): Promise<any> {
  const token = process.env.CALENDLY_TOKEN;
  if (!token) throw new Error("Missing CALENDLY_TOKEN");

  const inviteePayload = {
    email,
    name,
  };

  const res = await fetch(`https://api.calendly.com/scheduled_events/${eventType}/invitees`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(inviteePayload)
  });

  if (!res.ok) throw new Error(`Calendly error: ${res.status}`);
  return await res.json();
} 