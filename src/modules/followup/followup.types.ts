export type FollowUpEventType =
  | "EMAIL_SENT"
  | "EMAIL_OPENED"
  | "DOC_REJECTED"
  | "LENDER_SUBMISSION_SENT"
  | "LENDER_STATUS_UPDATED";

export type FollowUpEntityType =
  | "application"
  | "document"
  | "communication";

export type FollowUpEvent = {
  id: string;
  type: FollowUpEventType;
  entityType: FollowUpEntityType;
  entityId: string;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
};

export type FollowUpCondition =
  | {
      type: "metadata_equals";
      key: string;
      value: unknown;
    }
  | {
      type: "metadata_number_gte";
      key: string;
      value: number;
    }
  | {
      type: "not_event_since";
      eventType: FollowUpEventType;
      minutes: number;
    };

export type FollowUpAction =
  | {
      type: "SEND_SMS";
      message: string;
      phoneField: string;
    }
  | {
      type: "CREATE_TASK";
      title: string;
      description?: string | null;
    }
  | {
      type: "LOG_TIMELINE_EVENT";
      note?: string | null;
    };

export type FollowUpRule = {
  id: string;
  triggerEvent: FollowUpEventType;
  conditions: FollowUpCondition[];
  actions: FollowUpAction[];
};

export type FollowUpActionStatus = "success" | "skipped" | "failed";

export type FollowUpActionResult = {
  action: FollowUpAction;
  status: FollowUpActionStatus;
  message?: string | null;
};

export type FollowUpRuleResult = {
  ruleId: string;
  eventId: string;
  entityType: FollowUpEntityType;
  entityId: string;
  actionResults: FollowUpActionResult[];
};

export type FollowUpTimelineEntry = {
  ruleId: string;
  entityType: FollowUpEntityType;
  entityId: string;
  actionTaken: string;
  status: FollowUpActionStatus;
  message?: string | null;
  executedAt: Date;
};

export type FollowUpTask = {
  id: string;
  title: string;
  description?: string | null;
  entityType: FollowUpEntityType;
  entityId: string;
  createdAt: Date;
};

export type FollowUpEventStore = {
  addEvent: (event: FollowUpEvent) => void;
  listEvents: (filter?: {
    type?: FollowUpEventType;
    entityType?: FollowUpEntityType;
    entityId?: string;
  }) => FollowUpEvent[];
};

export type FollowUpIdempotencyStore = {
  has: (key: string) => boolean;
  mark: (key: string) => void;
};

export type SmsSender = (params: {
  to: string;
  body: string;
  metadata?: Record<string, unknown> | null;
}) => Promise<{ provider: string; messageId?: string | null } | null>;

export type FollowUpTaskWriter = (task: FollowUpTask) => Promise<void>;

export type FollowUpTimelineLogger = (
  entry: FollowUpTimelineEntry
) => Promise<void>;

export type FollowUpActionHandlers = {
  sendSms: SmsSender;
  createTask: FollowUpTaskWriter;
  logTimeline: FollowUpTimelineLogger;
};
