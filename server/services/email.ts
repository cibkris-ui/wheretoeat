import { Resend } from "resend";
import { createHmac } from "crypto";
import { storage } from "./storage";
import type { Booking, Restaurant } from "@shared/schema";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
const FROM_EMAIL = "WhereToEat <reservations@wheretoeat.ch>";

function generateActionSignature(cancelToken: string, action: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set");
  return createHmac("sha256", secret)
    .update(`${cancelToken}:${action}`)
    .digest("hex");
}

function generateActionUrl(cancelToken: string, action: string): string {
  const sig = generateActionSignature(cancelToken, action);
  return `https://wheretoeat.ch/api/bookings/action/${cancelToken}/${action}?sig=${sig}`;
}

export function verifyActionSignature(cancelToken: string, action: string, sig: string): boolean {
  const expected = generateActionSignature(cancelToken, action);
  return sig === expected;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "confirmed": return "Confirmée";
    case "pending": return "En attente de confirmation";
    case "waiting": return "Liste d'attente";
    default: return status;
  }
}

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background-color:#18181b;padding:24px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:1px;">WhereToEat</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f4f4f5;padding:16px 32px;text-align:center;font-size:12px;color:#71717a;">
            Cet email a été envoyé automatiquement par WhereToEat.<br>
            <a href="https://wheretoeat.ch" style="color:#71717a;">wheretoeat.ch</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-weight:600;color:#3f3f46;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;color:#18181b;">${escapeHtml(value)}</td>
  </tr>`;
}

function detailsTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:6px;margin:16px 0;">
    ${rows}
  </table>`;
}

export async function sendBookingConfirmation(booking: Booking, restaurant: Restaurant): Promise<void> {
  const isWaiting = booking.status === "waiting";

  const title = isWaiting
    ? "Votre réservation est en liste d'attente"
    : "Votre réservation est en attente de validation";

  const safeName = escapeHtml(restaurant.name);
  const intro = isWaiting
    ? `<p style="color:#71717a;font-size:15px;">Votre demande de réservation chez <strong>${safeName}</strong> a bien été enregistrée. Le restaurant est complet sur ce créneau, votre réservation est placée en <strong>liste d'attente</strong>. Vous serez informé si une place se libère.</p>`
    : `<p style="color:#71717a;font-size:15px;">Votre demande de réservation chez <strong>${safeName}</strong> a bien été enregistrée. Le restaurant va examiner votre demande et vous recevrez un email de confirmation.</p>`;

  const rows = [
    detailRow("Restaurant", restaurant.name),
    detailRow("Date", formatDate(booking.date)),
    detailRow("Heure", booking.time),
    detailRow("Personnes", `${booking.guests} adulte${booking.guests > 1 ? "s" : ""}${booking.children ? ` + ${booking.children} enfant${booking.children > 1 ? "s" : ""}` : ""}`),
    detailRow("Statut", statusLabel(booking.status)),
  ].join("");

  const html = baseHtml(`
    <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">${title}</h1>
    ${intro}
    ${detailsTable(rows)}
    ${booking.specialRequest ? `<p style="color:#71717a;font-size:14px;"><strong>Demande spéciale :</strong> ${escapeHtml(booking.specialRequest)}</p>` : ""}
    <p style="color:#71717a;font-size:14px;margin-top:24px;">À bientôt !</p>
  `);

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: booking.email,
    subject: isWaiting
      ? `Liste d'attente - ${restaurant.name}`
      : `Réservation en attente - ${restaurant.name}`,
    html,
  });
}

export async function sendBookingNotificationToRestaurant(booking: Booking, restaurant: Restaurant): Promise<void> {
  if (!restaurant.publicEmail) return;

  const rows = [
    detailRow("Nom", `${booking.firstName} ${booking.lastName}`),
    detailRow("Email", booking.email),
    detailRow("Téléphone", booking.phone),
    detailRow("Date", formatDate(booking.date)),
    detailRow("Heure", booking.time),
    detailRow("Personnes", `${booking.guests} adulte${booking.guests > 1 ? "s" : ""}${booking.children ? ` + ${booking.children} enfant${booking.children > 1 ? "s" : ""}` : ""}`),
    detailRow("Statut", statusLabel(booking.status)),
    ...(booking.specialRequest ? [detailRow("Demande spéciale", booking.specialRequest)] : []),
  ].join("");

  const confirmUrl = generateActionUrl(booking.cancelToken!, "confirm");
  const refuseUrl = generateActionUrl(booking.cancelToken!, "refuse");
  const waitingUrl = generateActionUrl(booking.cancelToken!, "waiting");

  const html = baseHtml(`
    <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Nouvelle réservation</h1>
    <p style="color:#71717a;font-size:15px;">Une nouvelle réservation a été effectuée sur votre restaurant <strong>${escapeHtml(restaurant.name)}</strong>.</p>
    ${detailsTable(rows)}
    <p style="color:#71717a;font-size:14px;margin-top:24px;">Gérez cette réservation directement :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td align="center" style="padding:4px;">
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">ACCEPTER</a>
        </td>
        <td align="center" style="padding:4px;">
          <a href="${refuseUrl}" style="display:inline-block;padding:12px 24px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">ANNULER</a>
        </td>
        <td align="center" style="padding:4px;">
          <a href="${waitingUrl}" style="display:inline-block;padding:12px 24px;background-color:#71717a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">LISTE D'ATTENTE</a>
        </td>
      </tr>
    </table>
  `);

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: restaurant.publicEmail,
    subject: `Nouvelle réservation - ${booking.firstName} ${booking.lastName}`,
    html,
  });
}

function guestsLabel(booking: Booking): string {
  return `${booking.guests} adulte${booking.guests > 1 ? "s" : ""}${booking.children ? ` + ${booking.children} enfant${booking.children > 1 ? "s" : ""}` : ""}`;
}

export async function sendBookingConfirmedEmail(booking: Booking, restaurant: Restaurant): Promise<void> {
  const rows = [
    detailRow("Restaurant", restaurant.name),
    detailRow("Date", formatDate(booking.date)),
    detailRow("Heure", booking.time),
    detailRow("Personnes", guestsLabel(booking)),
  ].join("");

  const html = baseHtml(`
    <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Votre réservation est confirmée !</h1>
    <p style="color:#71717a;font-size:15px;">Bonne nouvelle ! Votre réservation chez <strong>${escapeHtml(restaurant.name)}</strong> a été confirmée par le restaurant.</p>
    ${detailsTable(rows)}
    ${booking.specialRequest ? `<p style="color:#71717a;font-size:14px;"><strong>Demande spéciale :</strong> ${escapeHtml(booking.specialRequest)}</p>` : ""}
    ${restaurant.address ? `<p style="color:#71717a;font-size:14px;"><strong>Adresse :</strong> ${escapeHtml(restaurant.address)}</p>` : ""}
    <p style="color:#71717a;font-size:14px;margin-top:24px;">À bientôt !</p>
  `);

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: booking.email,
    subject: `Votre réservation est confirmée - ${restaurant.name}`,
    html,
  });
}

export async function sendBookingWaitingEmail(booking: Booking, restaurant: Restaurant): Promise<void> {
  const rows = [
    detailRow("Restaurant", restaurant.name),
    detailRow("Date", formatDate(booking.date)),
    detailRow("Heure", booking.time),
    detailRow("Personnes", guestsLabel(booking)),
  ].join("");

  const cancelUrl = `https://wheretoeat.ch/api/bookings/cancel/${booking.cancelToken}`;

  const html = baseHtml(`
    <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Votre réservation est en liste d'attente</h1>
    <p style="color:#71717a;font-size:15px;">Votre réservation chez <strong>${escapeHtml(restaurant.name)}</strong> a été placée en liste d'attente. Le restaurant vous contactera si une place se libère.</p>
    ${detailsTable(rows)}
    ${booking.specialRequest ? `<p style="color:#71717a;font-size:14px;"><strong>Demande spéciale :</strong> ${escapeHtml(booking.specialRequest)}</p>` : ""}
    <p style="color:#71717a;font-size:14px;margin-top:24px;">Si vous ne souhaitez plus attendre, vous pouvez annuler votre réservation :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td align="center">
        <a href="${cancelUrl}" style="display:inline-block;padding:12px 32px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Annuler ma réservation</a>
      </td></tr>
    </table>
  `);

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: booking.email,
    subject: `Votre réservation est en liste d'attente - ${restaurant.name}`,
    html,
  });
}

export async function sendBookingCancelledEmail(booking: Booking, restaurant: Restaurant): Promise<void> {
  const rows = [
    detailRow("Restaurant", restaurant.name),
    detailRow("Date", formatDate(booking.date)),
    detailRow("Heure", booking.time),
    detailRow("Personnes", guestsLabel(booking)),
  ].join("");

  const rebookUrl = `https://wheretoeat.ch/restaurant/${restaurant.id}`;

  const html = baseHtml(`
    <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Information concernant votre réservation</h1>
    <p style="color:#71717a;font-size:15px;">Nous sommes désolés, votre réservation chez <strong>${escapeHtml(restaurant.name)}</strong> n'a pas pu être maintenue.</p>
    ${detailsTable(rows)}
    <p style="color:#71717a;font-size:15px;margin-top:16px;">Le restaurant <strong>${escapeHtml(restaurant.name)}</strong> sera ravi de vous accueillir une prochaine fois. N'hésitez pas à réserver à nouveau !</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td align="center">
        <a href="${rebookUrl}" style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Réserver à nouveau</a>
      </td></tr>
    </table>
  `);

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: booking.email,
    subject: `Information concernant votre réservation - ${restaurant.name}`,
    html,
  });
}

export async function sendBookingReminder(booking: Booking, restaurant: Restaurant): Promise<void> {
  const rows = [
    detailRow("Restaurant", restaurant.name),
    detailRow("Date", formatDate(booking.date)),
    detailRow("Heure", booking.time),
    detailRow("Personnes", `${booking.guests} adulte${booking.guests > 1 ? "s" : ""}${booking.children ? ` + ${booking.children} enfant${booking.children > 1 ? "s" : ""}` : ""}`),
  ].join("");

  const html = baseHtml(`
    <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Rappel de votre réservation</h1>
    <p style="color:#71717a;font-size:15px;">Nous vous rappelons votre réservation de <strong>demain</strong> chez <strong>${escapeHtml(restaurant.name)}</strong>.</p>
    ${detailsTable(rows)}
    ${restaurant.address ? `<p style="color:#71717a;font-size:14px;"><strong>Adresse :</strong> ${escapeHtml(restaurant.address)}</p>` : ""}
    <p style="color:#71717a;font-size:14px;margin-top:24px;">À demain !</p>
  `);

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: booking.email,
    subject: `Rappel - Votre réservation demain chez ${restaurant.name}`,
    html,
  });
}

export async function processBookingReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  console.log(`Processing booking reminders for ${dateStr}...`);

  const bookingsForDate = await storage.getBookingsForDate(dateStr);
  console.log(`Found ${bookingsForDate.length} bookings for ${dateStr}`);

  for (const booking of bookingsForDate) {
    try {
      const restaurant = await storage.getRestaurant(booking.restaurantId);
      if (!restaurant) continue;

      await sendBookingReminder(booking, restaurant);
      console.log(`Reminder sent to ${booking.email} for booking #${booking.id}`);
    } catch (err) {
      console.error(`Failed to send reminder for booking #${booking.id}:`, err);
    }
  }

  console.log("Booking reminders processing complete.");
}
