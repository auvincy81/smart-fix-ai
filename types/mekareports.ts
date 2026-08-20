export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;
export type Money = string;

export type ShopMemberRole = "owner" | "manager" | "service_advisor" | "technician";
export type AppointmentStatus = "requested" | "confirmed" | "checked_in" | "in_service" | "completed" | "cancelled" | "no_show";
export type WorkOrderStatus = "draft" | "open" | "diagnosing" | "waiting_approval" | "approved" | "in_progress" | "completed" | "cancelled";
export type DiagnosisSeverity = "stop_driving" | "drive_to_shop" | "monitor";
export type InspectionStatus = "draft" | "in_progress" | "completed";
export type InspectionCondition = "good" | "attention" | "urgent" | "not_checked";
export type WorkOrderServiceStatus = "planned" | "approved" | "in_progress" | "completed" | "declined";
export type RecommendationStatus = "recommended" | "scheduled" | "completed" | "declined" | "dismissed";
export type RecommendationPriority = "low" | "medium" | "high" | "urgent";
export type CustomerQuestionStatus = "new" | "open" | "answered" | "closed";
export type RepairReportStatus = "draft" | "final" | "void";

interface ShopScoped { id: UUID; shopId: UUID; }
interface Timestamped { createdAt: ISODateTime; updatedAt: ISODateTime; }

export interface Shop extends Omit<ShopScoped, "shopId">, Timestamped {
  name: string; phone: string | null; email: string | null; address: string | null;
  city: string | null; state: string | null; postalCode: string | null;
}
export interface ShopMember extends ShopScoped {
  userId: UUID; role: ShopMemberRole; createdAt: ISODateTime;
}
export interface Customer extends ShopScoped, Timestamped {
  firstName: string; lastName: string; phone: string | null; email: string | null;
  address: string | null; city: string | null; state: string | null;
  postalCode: string | null; notes: string | null;
}
export interface Vehicle extends ShopScoped, Timestamped {
  customerId: UUID; vin: string | null; year: number | null; make: string | null;
  model: string | null; trim: string | null; engine: string | null;
  licensePlate: string | null; plateState: string | null; color: string | null;
  mileage: number | null; notes: string | null;
}
export interface Appointment extends ShopScoped, Timestamped {
  customerId: UUID; vehicleId: UUID | null; scheduledStart: ISODateTime;
  scheduledEnd: ISODateTime | null; customerConcern: string | null;
  internalNotes: string | null; status: AppointmentStatus;
}
export interface WorkOrder extends ShopScoped, Timestamped {
  customerId: UUID; vehicleId: UUID; appointmentId: UUID | null;
  workOrderNumber: string; status: WorkOrderStatus; mileageIn: number | null;
  mileageOut: number | null; customerComplaint: string | null;
  technicianNotes: string | null; assignedTechnicianId: UUID | null;
  openedAt: ISODateTime | null; completedAt: ISODateTime | null;
}
export interface Diagnosis extends ShopScoped, Timestamped {
  workOrderId: UUID; vehicleId: UUID; technicianId: UUID | null;
  symptoms: string | null; diagnosticCodes: string | null;
  technicianFindings: string | null; confirmedCause: string | null;
  aiSummary: string | null; severity: DiagnosisSeverity | null;
  aiResponse: Record<string, unknown> | null;
}
export interface Inspection extends ShopScoped {
  workOrderId: UUID; vehicleId: UUID; technicianId: UUID | null;
  inspectionType: string | null; status: InspectionStatus; summary: string | null;
  createdAt: ISODateTime; completedAt: ISODateTime | null;
}
export interface InspectionItem {
  id: UUID; inspectionId: UUID; category: string; itemName: string;
  condition: InspectionCondition; measurement: string | null;
  technicianNote: string | null; recommendation: string | null;
  sortOrder: number; createdAt: ISODateTime;
}
export interface WorkOrderService extends ShopScoped, Timestamped {
  workOrderId: UUID; description: string; serviceCategory: string | null;
  laborHours: Money | null; laborRate: Money | null; laborAmount: Money | null;
  status: WorkOrderServiceStatus; technicianId: UUID | null;
}
export interface ServiceRecommendation extends ShopScoped, Timestamped {
  customerId: UUID; vehicleId: UUID; workOrderId: UUID | null; title: string;
  description: string | null; priority: RecommendationPriority | null;
  recommendedDate: ISODate | null; recommendedMileage: number | null;
  estimatedCost: Money | null; status: RecommendationStatus;
}
export interface CustomerQuestion extends ShopScoped, Timestamped {
  customerId: UUID; vehicleId: UUID | null; appointmentId: UUID | null;
  subject: string | null; message: string; status: CustomerQuestionStatus;
  shopResponse: string | null; respondedAt: ISODateTime | null;
}
export interface RepairReport extends ShopScoped {
  workOrderId: UUID; customerId: UUID; vehicleId: UUID; reportNumber: string;
  reportStatus: RepairReportStatus; reportSnapshot: Record<string, unknown> | null;
  generatedAt: ISODateTime | null; createdAt: ISODateTime;
}
