// Unified service exports for Staff Server

export * from "./authService.js";
export * from "./azureBlob.js";

// Lenders (correct folder path)
export * from "./lenders/lenderService.js";

// Applications
export * from "./applications/applicationsService.js";

// Documents
export * from "./documents/documentService.js";

// Notifications
export * from "./notifications/notificationService.js";

// Pipeline
export * from "./pipeline/pipelineService.js";

// Communication
export * from "./communication/communicationService.js";

// Contacts / Companies / Deals (if present)
export * from "./contacts/contactsService.js";
export * from "./companies/companiesService.js";
export * from "./deals/dealsService.js";

// AI
export * from "./ai/aiService.js";
