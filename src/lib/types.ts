export type Service = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_min: number;
  price_is_starting: boolean;
  is_addon: boolean;
  sort_order: number;
  active: boolean;
};

export type BusinessHours = {
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

export type Review = {
  id: string;
  author_name: string;
  rating: number;
  body: string | null;
  published: boolean;
  created_at: string;
};

export type ServiceSnapshot = Pick<Service, "id" | "name" | "price_cents" | "duration_min" | "price_is_starting">;

export type AppointmentStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  id: string;
  manage_token: string;
  services: ServiceSnapshot[];
  starts_at: string;
  ends_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string | null;
  amount_cents: number;
  status: AppointmentStatus;
  payment_method: "in_shop" | "card";
  payment_status: "unpaid" | "paid" | "refunded";
  created_at: string;
};

export type PublicAppointment = {
  id: string;
  services: ServiceSnapshot[];
  starts_at: string;
  ends_at: string;
  customer_name: string;
  amount_cents: number;
  status: AppointmentStatus;
  payment_method: "in_shop" | "card";
  payment_status: "unpaid" | "paid" | "refunded";
  can_cancel: boolean;
  has_review: boolean;
};
