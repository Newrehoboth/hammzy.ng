export type Provider = "Twilio" | "Telnyx" | "Vonage" | "5SIM" | "SMS-Activate";

export interface PhoneNumber {
  id: string;
  number: string;
  country: string;
  countryCode: string;
  flag: string;
  service: string;
  provider: Provider;
  price: number;
  sms: boolean;
  voice: boolean;
}

export interface OwnedNumber extends PhoneNumber {
  purchasedAt: string;
  expiresAt: string;
  status: "active" | "expiring" | "cancelled";
  smsCount: number;
}

export interface Sms {
  id: string;
  sender: string;
  body: string;
  otp?: string;
  receivedAt: string;
}

export const providers: Provider[] = [
  "Twilio",
  "Telnyx",
  "Vonage",
  "5SIM",
  "SMS-Activate",
];

export const services = [
  "WhatsApp",
  "Telegram",
  "Google",
  "Instagram",
  "Discord",
  "Any service",
];

export const marketplace: PhoneNumber[] = [
  { id: "n1", number: "+1 (415) 555-0192", country: "United States", countryCode: "US", flag: "🇺🇸", service: "Any service", provider: "Twilio", price: 4.5, sms: true, voice: true },
  { id: "n2", number: "+44 7700 900812", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", service: "WhatsApp", provider: "Telnyx", price: 3.9, sms: true, voice: false },
  { id: "n3", number: "+49 1512 3456789", country: "Germany", countryCode: "DE", flag: "🇩🇪", service: "Telegram", provider: "Vonage", price: 5.2, sms: true, voice: true },
  { id: "n4", number: "+33 6 12 34 56 78", country: "France", countryCode: "FR", flag: "🇫🇷", service: "Google", provider: "5SIM", price: 2.1, sms: true, voice: false },
  { id: "n5", number: "+234 801 234 5678", country: "Nigeria", countryCode: "NG", flag: "🇳🇬", service: "Instagram", provider: "SMS-Activate", price: 1.4, sms: true, voice: false },
  { id: "n6", number: "+91 98765 43210", country: "India", countryCode: "IN", flag: "🇮🇳", service: "Any service", provider: "Twilio", price: 1.9, sms: true, voice: true },
  { id: "n7", number: "+1 (646) 555-0148", country: "United States", countryCode: "US", flag: "🇺🇸", service: "Discord", provider: "Telnyx", price: 4.8, sms: true, voice: true },
  { id: "n8", number: "+55 11 91234-5678", country: "Brazil", countryCode: "BR", flag: "🇧🇷", service: "WhatsApp", provider: "5SIM", price: 2.6, sms: true, voice: false },
  { id: "n9", number: "+61 412 345 678", country: "Australia", countryCode: "AU", flag: "🇦🇺", service: "Google", provider: "Vonage", price: 5.9, sms: true, voice: true },
  { id: "n10", number: "+81 90 1234 5678", country: "Japan", countryCode: "JP", flag: "🇯🇵", service: "Telegram", provider: "Twilio", price: 6.4, sms: true, voice: true },
  { id: "n11", number: "+34 612 34 56 78", country: "Spain", countryCode: "ES", flag: "🇪🇸", service: "Any service", provider: "SMS-Activate", price: 2.3, sms: true, voice: false },
  { id: "n12", number: "+27 82 123 4567", country: "South Africa", countryCode: "ZA", flag: "🇿🇦", service: "Instagram", provider: "5SIM", price: 1.7, sms: true, voice: false },
];

export const ownedNumbers: OwnedNumber[] = [
  { ...marketplace[0], purchasedAt: "2026-05-02", expiresAt: "2026-07-02", status: "active", smsCount: 42 },
  { ...marketplace[2], purchasedAt: "2026-05-18", expiresAt: "2026-06-22", status: "expiring", smsCount: 11 },
  { ...marketplace[5], purchasedAt: "2026-04-11", expiresAt: "2026-08-11", status: "active", smsCount: 87 },
  { ...marketplace[7], purchasedAt: "2026-06-01", expiresAt: "2026-06-19", status: "expiring", smsCount: 3 },
];

export const inbox: Sms[] = [
  { id: "s1", sender: "WhatsApp", body: "Your WhatsApp code is 482-913. Don't share it.", otp: "482913", receivedAt: "2026-06-16T09:41:00Z" },
  { id: "s2", sender: "Google", body: "G-739204 is your Google verification code.", otp: "739204", receivedAt: "2026-06-16T09:12:00Z" },
  { id: "s3", sender: "+1 415 555 0110", body: "Hey, are we still on for the demo at 2pm?", receivedAt: "2026-06-16T08:55:00Z" },
  { id: "s4", sender: "Telegram", body: "Login code: 55218. Valid for 5 minutes.", otp: "55218", receivedAt: "2026-06-15T21:30:00Z" },
  { id: "s5", sender: "Instagram", body: "164 092 is your Instagram code. Don't share it.", otp: "164092", receivedAt: "2026-06-15T18:02:00Z" },
];

export const activities = [
  { id: "a1", type: "purchase", text: "Purchased +1 (415) 555-0192", time: "2h ago" },
  { id: "a2", type: "sms", text: "SMS received from WhatsApp", time: "3h ago" },
  { id: "a3", type: "payment", text: "Payment of $4.50 successful", time: "2h ago" },
  { id: "a4", type: "renew", text: "Renewed +49 1512 3456789", time: "1d ago" },
  { id: "a5", type: "sms", text: "SMS received from Google", time: "1d ago" },
];

export const monthlyPurchases = [
  { month: "Jan", purchases: 8, sms: 120 },
  { month: "Feb", purchases: 12, sms: 180 },
  { month: "Mar", purchases: 9, sms: 150 },
  { month: "Apr", purchases: 18, sms: 240 },
  { month: "May", purchases: 22, sms: 310 },
  { month: "Jun", purchases: 16, sms: 280 },
];

export const spendingData = [
  { month: "Jan", spend: 36 },
  { month: "Feb", spend: 54 },
  { month: "Mar", spend: 41 },
  { month: "Apr", spend: 79 },
  { month: "May", spend: 96 },
  { month: "Jun", spend: 68 },
];

export const payments = [
  { id: "p1", number: "+1 (415) 555-0192", amount: 4.5, method: "Card", status: "Paid", date: "2026-06-14" },
  { id: "p2", number: "+49 1512 3456789", amount: 5.2, method: "Apple Pay", status: "Paid", date: "2026-06-10" },
  { id: "p3", number: "+91 98765 43210", amount: 1.9, method: "Bank Transfer", status: "Paid", date: "2026-06-02" },
  { id: "p4", number: "+55 11 91234-5678", amount: 2.6, method: "Card", status: "Failed", date: "2026-05-29" },
  { id: "p5", number: "+44 7700 900812", amount: 3.9, method: "Google Pay", status: "Paid", date: "2026-05-21" },
];